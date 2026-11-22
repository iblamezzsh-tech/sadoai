import type { Metadata } from 'next'
import { CameraLab } from '@/components/camera-lab'
export const metadata: Metadata = { title: 'Ishora laboratoriyasi' }
export default function Page() { return <CameraLab /> }
