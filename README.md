# 온핏 · onfit

모바일 반응형 운동·휴식·컨디션·식사·인바디 기록 앱.

## 실행

Node.js 22 이상에서 `/workspace/helth` 디렉터리에서 실행합니다.

```sh
npm ci
npm run dev
```

배포 빌드: `npm run build`, 프로덕션 실행: `npm start` (기본 3000 포트).

## 현재 지원

- 대시보드, 운동 기록, 세트/운동 사이 휴식 타이머, RPE와 컨디션
- 기록 기반 주간/월간 운동 볼륨 통계
- 식사 영양정보 수동 입력, 인바디 사진 임시 미리보기와 수치 수동 입력
- 게스트 브라우저 로컬 저장, 로그인 계정별 Supabase 저장, JSON 내보내기/복원, 삭제
- Google/Kakao/Apple OAuth, 이메일 가입·로그인·메일 확인·비밀번호 재설정 (실제 provider 설정 필요)
- 개인 OpenAI API 키를 이용한 목표·기록 기반 대화

API 키는 React 메모리에만 보관하며 저장하지 않습니다. `/api/coach`는 키를 서버를 통해 OpenAI HTTPS API로 전달하고, 제한된 기록을 대화 맥락으로 전송합니다. ChatGPT 구독과 별도로 개인 OpenAI API 요금이 발생합니다. 실제 키 없이 응답을 검증하지 않았습니다.

## 제한

Supabase 설정 전에는 게스트 모드로 동작합니다. 설정과 SQL 적용 후 로그인 사용자의 기록을 계정별로 클라우드 저장합니다. 실제 provider 인증, 원격 RLS와 기기 간 복원은 프로젝트 연결 후 검증이 필요합니다. 설정은 [로그인/배포 안내](docs/AUTH_SETUP.md)를 참고하세요. 인바디 OCR·식사 사진 분석·백그라운드 알림은 아직 제공하지 않습니다. 게스트 기록은 현재 브라우저에만 저장되므로 백업이 필요합니다. 인바디 사진은 저장/전송하지 않고 수치만 저장합니다. 설치 manifest는 제공하지만 오프라인 서비스 워커는 없습니다. 식사 목표 숫자는 일반적인 참고 예시이며 개인 처방이 아닙니다.

프로덕션 공개 전 사용자 소유 프로젝트에서 DB SQL/RLS와 로그인 provider 설정을 적용하고 실제 인증·계정 분리·기기 간 동기화를 검증해야 합니다. AI 엔드포인트 요청 제한과 인증, 회원 탈퇴·백업 정책 등도 추가해야 합니다. 개발용 로컬 앱에서 먼저 기능을 검토합니다.

## 검증

`npm run build`, `npm run typecheck`. 설정 없는 게스트 모드의 브라우저 회귀 검증은 `npx playwright install chromium` 후 `npm run test:e2e`로 실행합니다. 이미 설치된 Chromium을 쓸 때 `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`를 사용할 수 있습니다. 테스트는 로컬 저장, 휴식 타이머, 로그인 미설정 상태, 복원 검증, 모바일 화면, AI 입력 검증을 다룹니다. 실제 외부 로그인·원격 DB 정책 검증을 대체하지 않습니다.

`npm run test:db`는 PGlite의 로컬 PostgreSQL 엔진에서 실제 SQL을 실행해 RLS 계정 분리, 익명 접근 차단, 기록 저장, revision 충돌을 확인합니다. Supabase 원격 프로젝트/메일/OAuth 연결 검증은 별도입니다.
