"use client";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import imageData from "../lib/exercise-images.json";
export default function ExerciseIllustration({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const [frame, setFrame] = useState(0),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setFrame(0);
    setFailed(false);
  }, [name]);
  const item = Object.hasOwn(imageData, name)
    ? imageData[name as keyof typeof imageData]
    : undefined;
  if (!item || failed)
    return (
      <div
        className={"exercise-photo-missing " + (small ? "thumbnail" : "")}
        role="img"
        aria-label={`${name} 이미지 미등록`}
      >
        <ImageOff size={small ? 24 : 35} />
        <span>
          {small
            ? "이미지 준비 중"
            : "이 종목에 맞는 사진은 아직 등록되지 않았어요"}
        </span>
      </div>
    );
  return (
    <div className={"exercise-photo " + (small ? "thumbnail" : "")}>
      <img
        src={item.images[small ? 0 : Math.min(frame, item.images.length - 1)]}
        alt={`${name} ${frame === 0 ? "시작" : "마무리"} 자세`}
        loading={small ? "lazy" : "eager"}
        decoding="async"
        onError={() => setFailed(true)}
      />
      {!small && (
        <div className="exercise-photo-frames" aria-label="운동 자세 사진">
          <button
            type="button"
            className={frame === 0 ? "selected" : ""}
            onClick={() => setFrame(0)}
          >
            시작 자세
          </button>
          <button
            type="button"
            className={frame === 1 ? "selected" : ""}
            onClick={() => setFrame(1)}
          >
            마무리 자세
          </button>
        </div>
      )}
    </div>
  );
}
