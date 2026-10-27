# 온핏 로그인 · 공개 주소 연결

현재 로그인 UI와 Supabase 연동 코드는 작성되었지만 실제 프로젝트, OAuth 앱, 배포 주소는 연결되지 않았습니다. 다음 단계는 사용자 소유 계정에서 진행합니다. 비밀번호와 비밀키를 채팅이나 Git에 넣지 마세요.

## 1. Supabase 만들기

1. https://supabase.com 에서 가입 → New project. 접근 가능한 지역과 DB 비밀번호를 선택합니다. 비밀번호는 사용자 비밀번호 관리자에 보관합니다.
2. SQL Editor에서 저장소의 `supabase/schema.sql` 전체를 실행합니다. 계정 소유자만 접근하는 RLS 정책과 저장 충돌 검사 함수를 만듭니다.
3. 프로젝트 Connect 또는 Settings의 API/키 화면에서 Project URL과 공개용 publishable key를 확인합니다. legacy anon key도 지원합니다. service_role/secret key는 앱에 넣지 않습니다.
4. `.env.example`을 `.env.local`로 복사하여 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정합니다. 이 두 항목은 공개용 연결 정보입니다. 환경 설정이나 배포 서비스에서 안전하게 입력해도 됩니다. 설정 변경 뒤 앱을 다시 빌드/시작합니다.
5. Authentication의 Email provider를 활성화하고 이메일 확인을 켭니다. 실제 가입 메일을 안정적으로 보내려면 SMTP 서비스와 발신 도메인 설정이 필요할 수 있습니다. Supabase 기본 발송의 수신자 제한/한도는 현재 공식 안내에서 확인합니다.

## 2. Vercel 배포

1. https://vercel.com 에서 가입하고 GitHub를 연결합니다.
2. 앱 코드를 사용자의 GitHub 저장소에 올린 후 Add New Project에서 해당 저장소를 선택합니다. 현재 클라우드 작업의 파일은 자동으로 GitHub에 올라가지 않습니다.
3. Framework: Next.js, Build: `npm run build`. Environment Variables에 위 두 공개 설정을 추가합니다.
4. Deploy 완료 후 제공되는 `https://프로젝트.vercel.app` 주소가 실제 접속 주소입니다. 현재 작업에서 배포를 실행하지 않았으므로 아직 주소가 없습니다.
5. Supabase Authentication → URL Configuration에서 Site URL을 그 주소로, 허용 Redirect URL을 `https://프로젝트.vercel.app/auth/callback` 및 `https://프로젝트.vercel.app/auth/callback?recovery=1`로 등록합니다. 개발용 주소는 개발 프로젝트에서만 별도로 허용합니다.

## 3. 소셜 로그인 등록

모든 제공업체의 OAuth callback은 **앱 자체 주소가 아닌 Supabase 대시보드에 표시되는 callback** (`https://프로젝트-ref.supabase.co/auth/v1/callback`)입니다. 정확한 주소는 해당 프로젝트의 provider 설정에서 복사합니다. OAuth client secret은 Supabase provider 설정에만 보관합니다.

- **Google**: Google Cloud Console에서 OAuth 동의 화면과 웹 애플리케이션 클라이언트를 만듭니다. Supabase callback을 승인된 redirect URI로 등록하고 Client ID/Secret을 Supabase Google provider에 설정합니다. 테스트 모드라면 허용 사용자를 추가하고 외부 공개 전 필요한 심사를 완료합니다.
- **카카오**: Kakao Developers에서 애플리케이션을 만들고 웹 플랫폼/서비스 도메인, 카카오 로그인, redirect URI를 등록합니다. 앱이 요청하는 닉네임과 이메일 동의 항목을 설정합니다. 이메일 권한은 앱 설정/자격에 따라 추가 확인이 필요합니다. REST API 키와 활성화한 client secret을 Supabase Kakao provider에 설정합니다. 동의가 불가능한 scope를 켜 둔 상태로 공개하지 않습니다.
- **Apple**: Apple Developer 계정에서 Sign in with Apple용 App ID/Services ID와 도메인/return URL을 구성하고, Supabase 지침에 따라 Team ID·Key ID·private key로 client secret을 생성하여 provider에 등록합니다. 웹 로그인은 통상 유료 Apple Developer Program 가입이 필요하며, client secret 갱신 주기를 관리해야 합니다. 기기 지원 때문에 Apple 로그인이 필수인 것은 아닙니다. iPhone에서도 이메일·구글·카카오로 로그인할 수 있습니다.
- **직접 가입**: 이메일+비밀번호, 메일 확인, 로그인, 비밀번호 재설정 기능이 구현되어 있습니다. 같은 이메일을 쓰더라도 provider의 계정 연결 정책과 이메일 확인 여부에 따라 별도 계정이 될 수 있으니, 다른 방식으로 바꾸기 전 기존 로그인 방식을 사용합니다.

공식 참고: https://supabase.com/docs/guides/auth/social-login/auth-google · https://supabase.com/docs/guides/auth/social-login/auth-kakao · https://supabase.com/docs/guides/auth/social-login/auth-apple · https://supabase.com/docs/guides/auth/passwords

## 4. 실제 연결 후 필수 검증

- 이메일 가입 → 메일 확인 → 로그인 → 비밀번호 재설정 → 로그아웃.
- Google/Kakao/Apple 각 로그인 → callback 복귀 → 취소/만료 안내.
- 계정 A에서 기록 → 다른 브라우저에서 같은 계정으로 로그인 → 기록 복원.
- 다른 계정 B에서는 A의 기록이 보이지 않아야 합니다. 익명 REST 요청과 B의 토큰으로 A의 user_id를 조회/변경해도 접근이 차단되어야 합니다.
- 같은 계정의 두 기기에서 동시에 수정하면 나중의 변경은 충돌 안내가 나와야 합니다. 미저장 기록을 백업한 뒤 다시 불러옵니다.
- 네트워크 저장 실패 시 상태 표시/재시도, 로그아웃 후 이전 계정의 기록·AI 키·대화가 화면에 남지 않는지 확인합니다.

게스트 데이터는 사용자 동의 없이 새 계정에 자동 업로드하지 않습니다. 로그인 후 상단의 게스트 기록 가져오기 버튼으로 기존 기록을 계정에 합칠 수 있습니다. JSON 백업 → 로그인 → 설정에서 복원하는 방법도 지원합니다. 원본 게스트 기록은 자동 삭제하지 않습니다. JSON에는 건강 기록이 포함되므로 보관에 주의합니다.

## 비용과 남은 범위

무료 플랜으로 검토할 수 있지만 용량/이메일/트래픽/프로젝트 정책에 따라 비용이 발생할 수 있습니다. Apple Developer는 별도 비용이 필요할 수 있습니다. 사진 원본 저장과 OCR은 아직 제공하지 않습니다. 실제 원격 인증과 RLS 검증은 프로젝트 연결 전에는 완료로 볼 수 없습니다. 로그인 삭제(회원 탈퇴)는 별도 관리 API/정책 구현이 필요하며 현재 제공되는 전체 삭제는 건강 기록 초기화입니다.
