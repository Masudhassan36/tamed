import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  className?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export default function Logo({
  className = "",
  imageSrc,
  imageWidth = 240,
  imageHeight = 56,
}: LogoProps) {
  return (
    <Link href="/" className={`wordmark ${className}`} aria-label="Tamed home">
      {imageSrc ? (
        <Image className="wordmark-image" src={imageSrc} alt="TAMED" width={imageWidth} height={imageHeight} />
      ) : (
        <>
          <Image className="wordmark-symbol" src="/images/tamed-logo.svg" alt="" width={60} height={54} />
          <Image className="wordmark-image" src="/images/tamed-wordmark.svg" alt="" width={692} height={144} />
        </>
      )}
    </Link>
  );
}
