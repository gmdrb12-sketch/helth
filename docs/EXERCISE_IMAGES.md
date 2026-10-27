# 운동 이미지 출처

사진 출처: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), 공개 라이선스 [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md). 해당 저장소의 README는 이미지와 JSON을 public-domain dataset으로 배포한다고 명시합니다. 라이선스 원문은 `docs/licenses/free-exercise-db.txt`에 보관했습니다.

30개의 한국어 종목명을 원본 영어 종목 ID에 매핑했으며, 중복을 제외한 58장의 시작/마무리 사진을 `public/exercises`에 원본 그대로 보관합니다. 앱은 외부 이미지 서버에 의존하지 않습니다. 정확한 매핑은 `lib/exercise-images.json`에 기록합니다. 두 한국어 이름(시티드 케이블 로우/케이블 시티드 로우)은 같은 실제 운동의 같은 사진을 사용합니다.

기구와 동작이 일치하는 사진만 연결합니다. 어시스트 **머신** 풀업, 머신 와이드 풀다운, 전신 스트레칭처럼 이 자료에서 정확한 동작을 특정할 수 없는 종목이나 사용자 커스텀 운동에는 '이미지 준비 중'을 표시합니다. 밴드 보조 풀업을 머신 운동으로 표시하거나 다른 운동 그림을 임의로 대신 사용하지 않습니다.

일반 이름 중 런지는 덤벨 런지, 트라이셉스 익스텐션은 서서 하는 덤벨 오버헤드 익스텐션, 러닝은 트레드밀 러닝, 사이클은 실내 고정식 사이클 사진입니다. 운동 선택의 기구 메타데이터도 이에 맞춰 지정합니다.
