import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  className?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export default function Logo({ className = "", imageSrc, imageWidth = 240, imageHeight = 56 }: LogoProps) {
  return (
    <Link href="/" className={`wordmark ${className}`} aria-label="TAMED home">
      {imageSrc ? (
        <Image className="wordmark-image" src={imageSrc} alt="TAMED™" width={imageWidth} height={imageHeight} />
      ) : (
        <span className="wordmark-fallback">TAMED<span className="trademark">™</span></span>
      )}
    </Link>
  );
}