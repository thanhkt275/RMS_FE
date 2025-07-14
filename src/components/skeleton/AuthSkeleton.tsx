import { Skeleton } from "@/components/ui/skeleton"

export default function AuthSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="space-y-2 w-full max-w-xs">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-40 mx-auto" />
        <p className="text-gray-400 text-center mt-4">Please wait while we verify your credentials</p>
      </div>
    </div>
  )
}