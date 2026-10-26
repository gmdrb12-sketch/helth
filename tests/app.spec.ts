import { test, expect } from "@playwright/test";
test("세트별 다른 중량과 실제 휴식은 저장 후 새로고침해도 표시된다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sync-banner")).toContainText("게스트");
  await page.getByRole("button", { name: "운동 시작", exact: true }).click();
  await page
    .locator(".exercise-options button")
    .filter({ hasText: "벤치프레스" })
    .first()
    .click();
  await page.getByRole("button", { name: "1 운동 추가", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "벤치프레스 1세트 중량" })
    .fill("20");
  await page
    .getByRole("spinbutton", { name: "벤치프레스 1세트 횟수" })
    .fill("12");
  await page
    .getByRole("spinbutton", { name: "벤치프레스 2세트 중량" })
    .fill("40");
  await page
    .getByRole("spinbutton", { name: "벤치프레스 2세트 횟수" })
    .fill("10");
  await page.clock.install();
  await page
    .getByRole("button", { name: "벤치프레스 1세트 완료", exact: true })
    .click();
  await page.clock.fastForward(90000);
  await expect(page.getByTestId("rest-timer")).toHaveText("01:30");
  await page
    .getByRole("button", { name: "다음 세트 시작", exact: true })
    .click();
  await expect(page.locator(".set-line").first()).toContainText("01:30");
  await page
    .getByRole("button", { name: "벤치프레스 2세트 완료", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "운동 저장", exact: true }).click();
  await expect(page.locator(".sync-banner")).toContainText("저장됨");
  await page.reload();
  await expect(page.locator(".logged-exercise h4")).toHaveText("벤치프레스");
  await expect(page.locator(".logged-set").first()).toContainText("01:30");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("onfit-data")!),
  );
  expect(stored.workouts).toHaveLength(1);
  expect(
    stored.workouts[0].setDetails.map((s: { weight: number }) => s.weight),
  ).toEqual([20, 40]);
  expect(stored.workouts[0].restEvents[0].kind).toBe("세트 사이");
  expect(stored.workouts[0].rest).toBe(90);
});
test("세트 추가·삭제와 진행 중 타이머 새로고침 복원", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".sync-banner")).toContainText("게스트");
  await page.getByRole("button", { name: "운동 시작", exact: true }).click();
  await page
    .locator(".exercise-options button")
    .filter({ hasText: "벤치프레스" })
    .first()
    .click();
  await page.getByRole("button", { name: "1 운동 추가", exact: true }).click();
  await page.getByRole("button", { name: "세트 추가", exact: true }).click();
  await expect(page.locator(".set-line")).toHaveCount(4);
  expect(
    await page
      .locator(".training-overlay")
      .evaluate((e) => e.scrollWidth <= innerWidth),
  ).toBe(true);
  await page
    .getByRole("spinbutton", { name: "벤치프레스 4세트 중량" })
    .fill("65");
  await page
    .getByRole("button", { name: "벤치프레스 3세트 삭제", exact: true })
    .click();
  await expect(page.locator(".set-line")).toHaveCount(3);
  await expect(
    page.getByRole("spinbutton", { name: "벤치프레스 3세트 중량" }),
  ).toHaveValue("65");
  await page
    .getByRole("button", { name: "벤치프레스 1세트 완료", exact: true })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("onfit-workout-draft:guest") || "{}")
            .rest?.startedAt,
      ),
    )
    .toBeTruthy();
  await page.reload();
  await page
    .getByRole("button", { name: "운동 이어하기", exact: true })
    .click();
  await expect(page.locator(".set-line")).toHaveCount(3);
  await expect(
    page.getByRole("spinbutton", { name: "벤치프레스 3세트 중량" }),
  ).toHaveValue("65");
  await expect(page.locator(".rest-dock-label")).toContainText("휴식 측정 중");
});
test("설정이 없는 로그인은 명확하게 비활성화하고 가입/재설정 메뉴를 제공한다", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByText("로그인 서비스 연결 준비 중")).toBeVisible();
  for (const name of [
    "Google로 계속하기",
    "카카오로 계속하기",
    "Apple로 계속하기",
  ])
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  await page.getByRole("button", { name: "직접 가입하기" }).click();
  await expect(
    page.getByRole("button", { name: "이메일로 가입하기" }),
  ).toBeDisabled();
  await expect(
    page.getByText("이름 또는 닉네임", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "로그인하기", exact: true }).click();
  // Disabled forms do not allow reset submission; the mode switch is inside the form.
  await expect(
    page.getByRole("button", { name: "이메일로 로그인", exact: true }),
  ).toBeDisabled();
  await page.goto("/auth/callback?code=invalid");
  await expect(page.locator("p[role=alert]")).toContainText("연결되지");
});
test("식사 저장과 백업 복원, 잘못된 백업 차단", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".sync-banner")).toContainText("게스트");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "건강 요약" })
    .click();
  await page
    .getByRole("button", { name: "식사 기록하기", exact: true })
    .click();
  await page.locator("input[name=name]").fill("닭가슴살과 현미밥");
  await page.locator("input[name=calories]").fill("500");
  await page.locator("input[name=protein]").fill("35");
  await page.getByRole("button", { name: "기록 저장하기" }).click();
  await expect(
    page.locator(".stat-value").filter({ hasText: "500" }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "마이 · 설정" })
    .click();
  const input = page.locator(".import-label input");
  await input.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"workouts":[{}],"meals":[],"body":[],"goal":""}'),
  });
  await expect(page.getByRole("status")).toContainText("올바른 온핏");
  page.on("dialog", (d) => d.accept());
  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        workouts: [],
        meals: [],
        body: [],
        goal: "내 계정에 복원할 목표",
      }),
    ),
  });
  await expect(page.locator("textarea").first()).toHaveValue(
    "내 계정에 복원할 목표",
  );
});
test("휴대폰 화면에 가로 넘침이 없고 로그인에 접근할 수 있다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".sync-banner")).toContainText("게스트");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "로그인 · 회원가입" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "카카오로 계속하기" }),
  ).toBeVisible();
});
test("AI 잘못된 요청은 거부한다", async ({ request }) => {
  const result = await request.post("/api/coach", {
    data: { key: "invalid", message: "test" },
  });
  expect(result.status()).toBe(400);
});

test("운동 라이브러리 다중 선택·부위/기구 필터·즐겨찾기·종목 전환", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".sync-banner")).toContainText("게스트");
  await page.getByRole("button", { name: "운동 시작", exact: true }).click();
  await page
    .locator(".body-filter")
    .getByRole("button", { name: "등", exact: true })
    .click();
  await page
    .locator(".gear-filter")
    .getByRole("button", { name: "케이블", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "케이블 시티드 로우 선택", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "벤치프레스 선택", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "케이블 시티드 로우 즐겨찾기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "케이블 시티드 로우 선택", exact: true })
    .click();
  await page
    .getByRole("button", { name: "V-bar 랫풀다운 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "2 운동 추가", exact: true }).click();
  await expect(page.locator(".exercise-sheet:visible h2")).toHaveText(
    "케이블 시티드 로우",
  );
  await page
    .locator(".exercise-switcher")
    .getByRole("button", { name: /V-bar 랫풀다운/ })
    .click();
  await expect(page.locator(".exercise-sheet:visible h2")).toHaveText(
    "V-bar 랫풀다운",
  );
  expect(
    await page
      .locator(".training-overlay")
      .evaluate((e) => e.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "종목 추가", exact: true }).click();
  await page
    .locator(".library-tabs")
    .getByRole("button", { name: "좋아하는", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "케이블 시티드 로우 선택", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "V-bar 랫풀다운 선택", exact: true }),
  ).toHaveCount(0);
});

test("커스텀 운동을 생성하여 선택하고 세트별 체감강도를 펼친다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sync-banner")).toContainText("게스트");
  await page.getByRole("button", { name: "운동 시작", exact: true }).click();
  await page
    .getByRole("button", { name: "커스텀 운동 만들기", exact: true })
    .click();
  await page.locator(".custom-builder input").fill("나의 케이블 로우");
  await page
    .getByRole("button", { name: "만들고 선택하기", exact: true })
    .click();
  await page.getByRole("button", { name: "1 운동 추가", exact: true }).click();
  await expect(page.locator(".exercise-sheet:visible h2")).toHaveText(
    "나의 케이블 로우",
  );
  await expect(
    page.getByRole("spinbutton", { name: "나의 케이블 로우 1세트 RPE" }),
  ).toBeHidden();
  await page.getByRole("button", { name: /체감 강도 RPE/ }).click();
  await expect(
    page.getByRole("spinbutton", { name: "나의 케이블 로우 1세트 RPE" }),
  ).toBeVisible();
});
