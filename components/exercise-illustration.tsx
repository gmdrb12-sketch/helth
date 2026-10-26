"use client";
export default function ExerciseIllustration({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const back = /로우|풀|데드|등/.test(name),
    leg = /스쿼트|레그|런지|힙/.test(name),
    cable = /케이블|랫|풀|머신|체스트|펙덱/.test(name);
  return (
    <svg
      className={"exercise-illustration " + (small ? "thumbnail" : "")}
      viewBox="0 0 320 230"
      role="img"
      aria-label={`${name} 운동 도식`}
    >
      <defs>
        <linearGradient id={"metal-" + (small ? "s" : "l")} x2="1" y2="1">
          <stop stopColor="#a1a1a1" />
          <stop offset=".5" stopColor="#555" />
          <stop offset="1" stopColor="#333" />
        </linearGradient>
      </defs>
      <ellipse cx="168" cy="214" rx="115" ry="8" fill="#ffffff05" />
      {cable ? (
        <g fill="none" stroke="#6e7071" strokeWidth="7" strokeLinejoin="round">
          <path d="M54 210V29H145V47M43 211h75M66 29v181" />
          <path d="M145 47v21l-33 53" strokeWidth="2" stroke="#a7a7a7" />
          <circle cx="145" cy="47" r="6" />
          <path
            d="M86 199v-68h31M78 153h26M78 163h26M78 173h26M78 183h26"
            strokeWidth="3"
          />
        </g>
      ) : (
        <g fill="none" stroke="#6e7071" strokeWidth="7">
          <path d="M52 207V72M242 207V72M43 89h20M234 89h20M40 210h45M222 210h45" />
          <path d="M45 72h205" stroke="#b8b8b8" strokeWidth="5" />
          {[54, 67, 231, 244].map((x) => (
            <path key={x} d={`M${x} 54v36`} strokeWidth="8" />
          ))}
        </g>
      )}
      {!leg && (
        <g stroke="#5f6264" strokeWidth="7" fill="#333638">
          <path d="M115 178h115v10H115z" />
          <path d="M125 187v26m90-26v26" />
        </g>
      )}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={leg ? 164 : 175} cy={leg ? 51 : 65} r="15" fill="#c9cdce" />
        <path
          d={leg ? "M161 71l-12 49 31 24" : "M171 85l-11 65"}
          stroke="#d0d3d4"
          strokeWidth="31"
        />
        <path
          d={
            leg
              ? "M149 121l-32 36 13 44M179 142l28 21-5 40"
              : "M163 154l39 22 46 2M166 158l-27 23-7 27"
          }
          stroke="#b9bec0"
          strokeWidth="17"
        />
        <path
          d={
            leg
              ? "M157 83l-29-12-9-27M175 83l25-12 11-27"
              : back
                ? "M162 98l-27 26-21-2M180 99l-29 28-29-4"
                : "M165 96l-27-18-22 10M183 97l22-19 22 10"
          }
          stroke="#c8cccd"
          strokeWidth="12"
        />
        <path
          d={leg ? "M131 204h16m47 2h18" : "M124 211h17m105-31h17"}
          stroke="#8a9297"
          strokeWidth="9"
        />
      </g>
      <g fill="#ff503b" opacity=".92">
        {leg ? (
          <>
            <path d="M145 118l16 13-23 30-13-9z" />
            <path d="M168 135l13 0 23 23-10 9z" />
          </>
        ) : back ? (
          <>
            <path d="M160 83l13 2-3 50-14-11z" />
            <path d="M180 87l10 8-14 38-5-15z" />
            <path d="M146 108l8 7-17 15-7-8z" />
          </>
        ) : (
          <>
            <path d="M158 87l13-1 0 23-15-6z" />
            <path d="M176 86l12 9-4 13-11 1z" />
            <path d="M142 77l10 8-13 14-6-8z" />
          </>
        )}
      </g>
    </svg>
  );
}
