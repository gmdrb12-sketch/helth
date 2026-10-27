import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { empty, type Data } from "../lib/records";
const configured = process.env.ONFIT_AUTH_E2E === "1";
const project =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
function mockCloud() {
  const rows = new Map<string, { payload: Data; revision: number }>();
  const tokens = new Map<string, ReturnType<typeof account>>();
  let failWrites = false;
  function account(email: string) {
    return {
      id: email.startsWith("first")
        ? "11111111-1111-4111-8111-111111111111"
        : "22222222-2222-4222-8222-222222222222",
      email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: new Date().toISOString(),
    };
  }
  async function attach(context: BrowserContext) {
    await context.route(project + "/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname;
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      };
      if (req.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers: cors, body: "" });
      const respond = (body: unknown, status = 200) =>
        route.fulfill({
          status,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      if (path === "/auth/v1/settings")
        return respond({
          external: { email: true, google: false, kakao: false, apple: false },
          disable_signup: false,
          mailer_autoconfirm: false,
        });
      if (path === "/auth/v1/token") {
        const email = req.postDataJSON().email as string;
        const user = account(email);
        const expiry = Math.floor(Date.now() / 1000) + 3600;
        const token =
          Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
            "base64url",
          ) +
          "." +
          Buffer.from(
            JSON.stringify({
              sub: user.id,
              aud: "authenticated",
              role: "authenticated",
              exp: expiry,
            }),
          ).toString("base64url") +
          ".test-signature";
        tokens.set(token, user);
        return respond({
          access_token: token,
          refresh_token: "mock-refresh-" + user.id,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: expiry,
          user,
        });
      }
      const user = tokens.get(
        (req.headers().authorization || "").replace(/^Bearer /, ""),
      );
      if (path === "/auth/v1/logout")
        return route.fulfill({ status: 204, headers: cors, body: "" });
      if (path === "/auth/v1/user")
        return user ? respond(user) : respond({ message: "unauthorized" }, 401);
      if (!user) return respond({ code: "42501", message: "no user" }, 401);
      if (path === "/rest/v1/wellness_records") {
        if (url.searchParams.get("user_id") !== "eq." + user.id)
          return respond({ code: "42501" }, 403);
        const row = rows.get(user.id);
        return respond(row ? [row] : []);
      }
      if (path === "/rest/v1/rpc/save_wellness_records") {
        if (failWrites)
          return respond(
            { code: "network-test", message: "simulated unavailable" },
            503,
          );
        const body = req.postDataJSON();
        const old = rows.get(user.id);
        if (body.expected_revision !== (old?.revision || 0))
          return respond({ code: "40001" }, 409);
        const revision = (old?.revision || 0) + 1;
        rows.set(user.id, { payload: body.new_payload, revision });
        return respond(revision);
      }
      return respond({ message: "unexpected mocked request" }, 500);
    });
  }
  return {
    attach,
    rows,
    setFail: (fail: boolean) => {
      failWrites = fail;
    },
  };
}
async function login(page: Page, email = "first@example.test") {
  page.on("dialog", (d) => d.accept());
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("only-a-mocked-password");
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await expect(page.locator(".sync-banner")).toContainText("계정 기록 불러옴");
}
async function workout(page: Page) {
  await page.getByRole("button", { name: "운동 시작", exact: true }).click();
  await page
    .getByRole("button", { name: "벤치프레스 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "1 운동 추가", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "벤치프레스 1세트 중량", exact: true })
    .fill("60");
  await page
    .getByRole("spinbutton", { name: "벤치프레스 1세트 횟수", exact: true })
    .fill("8");
  await page
    .getByRole("button", { name: "벤치프레스 1세트 완료", exact: true })
    .click();
  await page.getByRole("button", { name: "운동 저장", exact: true }).click();
}
test.describe("실제 Supabase SDK를 모의 HTTP 서버에 연결한 로그인·저장 통합 검사", () => {
  test.skip(
    !configured,
    "ONFIT_AUTH_E2E=1 및 공개 Supabase 설정으로 빌드한 경우 실행",
  );
  test("이메일 로그인 후 저장·다른 브라우저 복원·다른 계정 분리·로그아웃", async ({
    browser,
  }) => {
    const cloud = mockCloud(),
      one = await browser.newContext(),
      two = await browser.newContext(),
      other = await browser.newContext();
    await cloud.attach(one);
    await cloud.attach(two);
    await cloud.attach(other);
    const a = await one.newPage();
    await login(a);
    await workout(a);
    await expect(a.locator(".sync-banner")).toContainText("클라우드 저장 완료");
    expect(
      cloud.rows.values().next().value?.payload.workouts[0].setDetails?.[0]
        .weight,
    ).toBe(60);
    const b = await two.newPage();
    await login(b);
    await expect(b.locator(".logged-exercise h4")).toHaveText("벤치프레스");
    await expect(b.locator(".logged-set").first()).toContainText("60");
    const c = await other.newPage();
    await login(c, "second@example.test");
    await expect(c.locator(".journal-empty")).toBeVisible();
    await expect(c.locator(".logged-exercise")).toHaveCount(0);
    await a
      .locator(".sidebar")
      .getByRole("button", { name: "마이 · 설정", exact: true })
      .click();
    await a.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(a.locator(".sync-banner")).toContainText("게스트 모드");
    await a
      .locator(".sidebar")
      .getByRole("button", { name: "운동일지", exact: true })
      .click();
    await expect(a.locator(".logged-exercise")).toHaveCount(0);
    await one.close();
    await two.close();
    await other.close();
  });
  test("저장 실패한 운동은 새로고침 후 복구하고 서버 저장에 성공하면 임시 사본을 정리한다", async ({
    browser,
  }) => {
    const cloud = mockCloud(),
      context = await browser.newContext();
    await cloud.attach(context);
    const page = await context.newPage();
    await login(page);
    cloud.setFail(true);
    await workout(page);
    await expect(page.locator(".sync-banner")).toContainText("계정 저장 실패");
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).some((k) =>
          k.startsWith("onfit-pending-records:"),
        ),
      ),
    ).toBe(true);
    cloud.setFail(false);
    await page.reload();
    await expect(page.locator(".sync-banner")).toContainText(
      "클라우드 저장 완료",
    );
    await expect(page.locator(".logged-exercise h4")).toHaveText("벤치프레스");
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).some((k) =>
          k.startsWith("onfit-pending-records:"),
        ),
      ),
    ).toBe(false);
    await context.close();
  });
  test("게스트 기록을 명시적으로 가져오고 같은 ID는 중복 저장하지 않는다", async ({
    browser,
  }) => {
    const cloud = mockCloud(),
      context = await browser.newContext();
    await cloud.attach(context);
    const page = await context.newPage();
    await page.goto("/");
    await page.evaluate(
      (g) => localStorage.setItem("onfit-data", JSON.stringify(g)),
      {
        ...empty,
        meals: [
          {
            id: "guest-meal",
            date: "2026-10-27",
            name: "게스트 점심",
            type: "점심",
            calories: 500,
            protein: 30,
          },
        ],
      },
    );
    await login(page);
    await page
      .getByRole("button", { name: "게스트 기록 가져오기", exact: true })
      .click();
    await expect(page.locator(".sync-banner")).toContainText(
      "클라우드 저장 완료",
    );
    const row = cloud.rows.values().next().value;
    expect(row?.payload.meals).toHaveLength(1);
    await expect(
      page.getByRole("button", { name: "게스트 기록 가져오기" }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".sync-banner")).toContainText(
      "계정 기록 불러옴",
    );
    await expect(
      page.getByRole("button", { name: "게스트 기록 가져오기" }),
    ).toHaveCount(0);
    await context.close();
  });
  test("미설정 소셜 로그인은 비활성화하고 이메일 로그인은 사용할 수 있다", async ({
    browser,
  }) => {
    const cloud = mockCloud(),
      context = await browser.newContext();
    await cloud.attach(context);
    const page = await context.newPage();
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /Google로 계속하기/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /카카오로 계속하기/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "이메일로 로그인", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".provider-hint")).toContainText("준비 중");
    await context.close();
  });
  test("다른 기기의 기록과 충돌하면 자동 덮어쓰지 않고 명시적으로 서버 기록을 선택한다", async ({
    browser,
  }) => {
    const cloud = mockCloud(),
      context = await browser.newContext();
    await cloud.attach(context);
    const page = await context.newPage();
    await login(page);
    cloud.setFail(true);
    await workout(page);
    await expect(page.locator(".sync-banner")).toContainText("계정 저장 실패");
    cloud.rows.set("11111111-1111-4111-8111-111111111111", {
      payload: { ...empty, goal: "다른 기기에서 변경한 목표" },
      revision: 1,
    });
    cloud.setFail(false);
    await page.reload();
    await expect(page.locator(".sync-banner")).toContainText("다른 기기");
    expect(
      cloud.rows.get("11111111-1111-4111-8111-111111111111")?.payload.workouts,
    ).toHaveLength(0);
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.locator(".sync-banner")).toContainText("다른 기기");
    expect(
      cloud.rows.get("11111111-1111-4111-8111-111111111111")?.payload.workouts,
    ).toHaveLength(0);
    await page
      .getByRole("button", { name: "서버 기록 다시 불러오기", exact: true })
      .click();
    await expect(page.locator(".sync-banner")).toContainText(
      "계정 기록 불러옴",
    );
    await expect(page.locator(".logged-exercise")).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).some((k) =>
          k.startsWith("onfit-pending-records:"),
        ),
      ),
    ).toBe(false);
    await context.close();
  });
});
