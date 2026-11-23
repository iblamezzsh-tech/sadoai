"""Train a candidate SadoAI linear model with signer-disjoint splits."""
import argparse
import json
from pathlib import Path
import re

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

WIDTH = 248


def read_windows(path, labels, size):
    groups = {split: [] for split in ("train", "validation", "test")}
    signers = {}
    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            item = json.loads(line)
            split, signer, label = item["split"], item["signer"], item["label"]
            if (
                split not in groups or label not in labels or not signer
                or item["reviewed"] is not True or item["consent"] is not True
                or not all(isinstance(item.get(key), str) and item[key].strip()
                           for key in ("handedness", "perspective", "lighting"))
            ):
                raise ValueError(f"Malformed or unreviewed example at line {line_number}")
            if signers.setdefault(signer, split) != split:
                raise ValueError(f"Signer appears in multiple splits at line {line_number}")
            window = np.asarray(item["frames"], dtype=np.float32)
            if window.shape != (size, WIDTH) or not np.isfinite(window).all():
                raise ValueError(f"Invalid frame matrix at line {line_number}")
            if not np.isin(window[:, 3::4], [0, 1]).all():
                raise ValueError(f"Invalid presence channel at line {line_number}")
            groups[split].append((window.reshape(-1), label))
    for split, rows in groups.items():
        if {label for _, label in rows} != set(labels):
            raise ValueError(f"Every class must appear in the {split} split")
    return {split: (np.stack([row[0] for row in rows]), np.array([row[1] for row in rows]))
            for split, rows in groups.items()}


def model_probabilities(weights, bias, frames):
    logits = frames @ weights.T + bias
    scores = np.exp(logits - logits.max(axis=1, keepdims=True))
    return scores / scores.sum(axis=1, keepdims=True)


def predict(probabilities, classes, threshold, margin):
    top = probabilities.argmax(axis=1)
    rows = np.arange(len(top))
    runner_up = np.sort(probabilities, axis=1)[:, -2]
    confident = (probabilities[rows, top] >= threshold) & (probabilities[rows, top] - runner_up >= margin)
    return np.where(confident, classes[top], "unknown")


def write_json(path, value):
    with path.open("x", encoding="utf-8") as target:
        json.dump(value, target, ensure_ascii=False, allow_nan=False, indent=2)
        target.write("\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("examples", type=Path)
    parser.add_argument("vocabulary", type=Path)
    parser.add_argument("model", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("--window", type=int, choices=range(6, 25), default=12)
    parser.add_argument("--threshold", type=float, default=.90)
    parser.add_argument("--margin", type=float, default=.25)
    parser.add_argument("--hold", type=int, choices=range(2, 13), default=3)
    parser.add_argument("--release", type=int, choices=range(3, 25), default=5)
    args = parser.parse_args()
    if not .75 <= args.threshold <= 1 or not .1 <= args.margin <= 1:
        parser.error("threshold and margin must satisfy the browser contract")
    info = json.loads(args.vocabulary.read_text(encoding="utf-8"))
    labels = info["labels"]
    if (not 1 <= len(labels) <= 31 or "unknown" in labels
        or not all(re.fullmatch(r"[a-z0-9_-]{1,64}", key) and isinstance(value, str)
                   and value.strip() and len(value) <= 120 for key, value in labels.items())):
        raise ValueError("Invalid vocabulary")
    if not all(isinstance(info["dataset"][key], str) and info["dataset"][key].strip()
               for key in ("name", "version", "license", "reference")):
        raise ValueError("Dataset provenance is required")
    data = read_windows(args.examples, {*labels, "unknown"}, args.window)
    classifier = LogisticRegression(max_iter=1000, random_state=0).fit(*data["train"])
    classes = classifier.classes_
    weights, bias = classifier.coef_, classifier.intercept_
    if len(classes) == 2:
        weights, bias = np.concatenate([-weights / 2, weights / 2]), np.concatenate([-bias / 2, bias / 2])
    if np.max(np.abs(weights)) > 100 or np.max(np.abs(bias)) > 100:
        raise ValueError("Coefficients exceed browser model bounds")
    results = {}
    for split in ("validation", "test"):
        frames, expected = data[split]
        probabilities = model_probabilities(weights, bias, frames)
        predicted = predict(probabilities, classes, args.threshold, args.margin)
        unknown = expected == "unknown"
        results[split] = {
            "classes": classes.tolist(),
            "classification": classification_report(expected, predicted, labels=classes, output_dict=True, zero_division=0),
            "confusion": confusion_matrix(expected, predicted, labels=classes).tolist(),
            "unknown_false_accept_rate": float(np.mean(predicted[unknown] != "unknown")),
        }
    write_json(args.report, {"protocol": "signer-independent", "results": results,
                             "limits": "Isolated preprocessed windows only. Measure event-level errors and latency separately."})
    entries = []
    for label, weight, offset in zip(classes, weights, bias, strict=True):
        entry = {"id": label, "bias": float(offset), "weights": weight.tolist()}
        if label != "unknown":
            entry["text"] = labels[label]
        entries.append(entry)
    write_json(args.model, {
        "schema": "sadoai-holistic-linear-v1", "language": "uz-sign", "dataset": info["dataset"],
        "validation": {"protocol": "signer-independent", "report": str(args.report)},
        "window": args.window, "threshold": args.threshold, "margin": args.margin,
        "hold": args.hold, "release": args.release, "classes": entries,
    })


if __name__ == "__main__":
    main()
