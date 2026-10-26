import {test,expect} from '@playwright/test';
test('게스트 운동/휴식 기록은 새로고침 후 유지된다',async({page})=>{
 await page.goto('/');await expect(page.locator('.sync-banner')).toContainText('게스트');
 await page.getByRole('button',{name:'오늘의 운동 시작하기'}).click();
 await page.locator('input[name=name]').fill('벤치프레스');
 await page.getByRole('button',{name:'세트 완료',exact:true}).click();
 await expect(page.locator('.timer-panel strong')).not.toHaveText('00:00',{timeout:5000});
 await page.getByRole('button',{name:'다음 세트 시작',exact:true}).click();
 await page.getByRole('button',{name:'기록 저장하기'}).click();
 await expect(page.locator('.sync-banner')).toContainText('저장됨');
 await page.reload();await expect(page.getByText('벤치프레스',{exact:true})).toBeVisible();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('onfit-data')!));
 expect(stored.workouts).toHaveLength(1);expect(stored.workouts[0].rest).toBeGreaterThan(0);
 expect(stored.workouts[0].restEvents[0].kind).toBe('세트 사이');
});
test('설정이 없는 로그인은 명확하게 비활성화하고 가입/재설정 메뉴를 제공한다',async({page})=>{
 await page.goto('/login');await expect(page.getByText('로그인 서비스 연결 준비 중')).toBeVisible();
 for(const name of ['Google로 계속하기','카카오로 계속하기','Apple로 계속하기'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'직접 가입하기'}).click();await expect(page.getByRole('button',{name:'이메일로 가입하기'})).toBeDisabled();
 await expect(page.getByText('이름 또는 닉네임',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'로그인하기',exact:true}).click();
 // Disabled forms do not allow reset submission; the mode switch is inside the form.
 await expect(page.getByRole('button',{name:'이메일로 로그인',exact:true})).toBeDisabled();
 await page.goto('/auth/callback?code=invalid');await expect(page.locator('p[role=alert]')).toContainText('연결되지');
});
test('식사 저장과 백업 복원, 잘못된 백업 차단',async({page})=>{
 await page.goto('/');await expect(page.locator('.sync-banner')).toContainText('게스트');
 await page.getByRole('button',{name:'식사 기록하기',exact:true}).click();await page.locator('input[name=name]').fill('닭가슴살과 현미밥');
 await page.locator('input[name=calories]').fill('500');await page.locator('input[name=protein]').fill('35');await page.getByRole('button',{name:'기록 저장하기'}).click();
 await expect(page.locator('.stat-value').filter({hasText:'500'})).toBeVisible();
 await page.locator('.sidebar').getByRole('button',{name:'마이 · 설정'}).click();
 const input=page.locator('.import-label input');await input.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"workouts":[{}],"meals":[],"body":[],"goal":""}')});
 await expect(page.getByRole('status')).toContainText('올바른 온핏');
 page.on('dialog',d=>d.accept());
 await input.setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({workouts:[],meals:[],body:[],goal:'내 계정에 복원할 목표'}))});
 await expect(page.locator('textarea').first()).toHaveValue('내 계정에 복원할 목표');
});
test('휴대폰 화면에 가로 넘침이 없고 로그인에 접근할 수 있다',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.sync-banner')).toContainText('게스트');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'로그인 · 회원가입'}).click();await expect(page).toHaveURL(/\/login$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('button',{name:'카카오로 계속하기'})).toBeVisible();
});
test('AI 잘못된 요청은 거부한다',async({request})=>{
 const result=await request.post('/api/coach',{data:{key:'invalid',message:'test'}});expect(result.status()).toBe(400);
});
