import Image from "next/image";
import { cn } from "@/lib/utils";

/** Signed / presigned URLs often need unoptimized (query tokens, exotic hosts). */
function shouldSkipOptimizer(src: string) {
  return (
    src.includes("/object/sign/") ||
    src.includes("token=") ||
    src.includes("X-Amz-") ||
    src.includes("X-Amz-Signature")
  );
}

export function PhotoImage({
  src,
  alt,
  className,
  priority,
  sizes = "100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={shouldSkipOptimizer(src)}
      className={cn("object-cover", className)}
    />
  );
}
