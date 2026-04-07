// functions/_middleware.ts
// 密码：Cloudflare Pages → Settings → Environment variables → LOGIN_PASSWORD

interface Env {
  LOGIN_PASSWORD: string
}

const COOKIE_NAME = 'emm_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7天

const LOGOUT_BUTTON_SCRIPT = `
<style>
  #emm-logout {
    position: fixed;
    bottom: 72px;
    left: 16px;
    z-index: 9999;
    padding: 6px 14px;
    border: 1px solid #d4d1ca;
    border-radius: 8px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: #28251d;
    font-size: 0.8rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity .2s;
    text-decoration: none;
  }
  #emm-logout:hover { opacity: 1; }
  @media (prefers-color-scheme: dark) {
    #emm-logout {
      background: rgba(28,27,25,0.92);
      border-color: #393836;
      color: #cdccca;
    }
  }
</style>
<a id="emm-logout" href="/logout">退出登录</a>
`

const LOGIN_HTML = (error: string) => `<!doctype html>
<html lang="zh">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Solara Musique · 登录</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f4f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #111110; }
      .box { background: #1c1b19; border-color: #393836; }
      h1, label { color: #cdccca; }
      p { color: #797876; }
      input { background: #171614; border-color: #393836; color: #cdccca; }
      input::placeholder { color: #5a5957; }
      input:focus { border-color: #4f98a3; box-shadow: 0 0 0 3px rgba(79,152,163,.25); }
    }
    .box {
      width: 100%; max-width: 360px; margin: 1rem; padding: 2rem;
      border-radius: 12px; border: 1px solid #dcd9d5;
      background: #fff; box-shadow: 0 12px 32px rgba(0,0,0,.08);
    }
    .header {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; margin-bottom: 1.5rem; text-align: center;
    }
    .header img { width: 48px; height: 48px; }
    h1 { font-size: 1.1rem; font-weight: 600; color: #28251d; }
    p  { font-size: 0.85rem; color: #7a7974; }
    label { display: block; font-size: 0.85rem; font-weight: 500; color: #28251d; margin-bottom: 6px; }
    input {
      width: 100%; padding: 9px 12px; border: 1px solid #d4d1ca;
      border-radius: 8px; font-size: 0.9rem; background: #f9f8f5;
      outline: none; transition: border-color .18s, box-shadow .18s;
    }
    input:focus { border-color: #01696f; box-shadow: 0 0 0 3px rgba(1,105,111,.18); }
    .error { font-size: 0.82rem; color: #c0392b; min-height: 1.2em; margin-top: 6px; }
    button {
      width: 100%; margin-top: 14px; padding: 10px; border: none;
      border-radius: 8px; background: #01696f; color: #fff;
      font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: opacity .18s;
    }
    button:hover { opacity: .88; }
  </style>
</head>
<body>
  <div class="box">
    <div class="header">
     
      <img src="/icon.png" alt="logo" onerror='this.style.display="none"'>
      <h1>Solara Musique</h1>
      <p>请输入访问密码以继续</p>
    </div>
    <form method="POST">
      <label for="pwd">访问密码</label>
      <input id="pwd" name="password" type="password" placeholder="请输入密码"
             autocomplete="current-password" autofocus required/>
      <div class="error">${error}</div>
      <button type="submit">登 录</button>
    </form>
  </div>
</body>
</html>`

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context
  const password = env.LOGIN_PASSWORD
  const url = new URL(request.url)

  // 未配置密码直接放行（本地开发免登录）
  if (!password) return next()

  // ── 退出登录：清除 Cookie 并跳回首页 ──
  if (url.pathname === '/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
      },
    })
  }

  // ── 检查 Cookie ──
  const cookie = request.headers.get('Cookie') || ''
  const authed = cookie.split(';').some(c => c.trim().startsWith(COOKIE_NAME + '=valid'))

  if (authed) {
    // 已登录：放行，并向响应 HTML 注入退出按钮
    const response = await next()
    const contentType = response.headers.get('Content-Type') || ''
    if (!contentType.includes('text/html')) return response

    //~ const original = await response.text()
    //~ const patched = original.replace('</body>', LOGOUT_BUTTON_SCRIPT + '</body>')
    //~ return new Response(patched, response)

	const original = await response.text()
	const patched = original.replace('</body>', LOGOUT_BUTTON_SCRIPT + '</body>')

	// 复制原始 headers，移除 Content-Encoding（text() 已解压，避免二次解压错误）
	//~ const newHeaders = new Headers(response.headers)
	//~ newHeaders.delete('Content-Encoding')
	//~ newHeaders.set('Content-Length', new TextEncoder().encode(patched).length.toString())

	//~ return new Response(patched, {
	  //~ status: response.status,
	  //~ statusText: response.statusText,
	  //~ headers: newHeaders,
	//~ })
	

// 旧写法 ❌ 继承了 Content-Encoding，导致浏览器二次解压失败
//~ return new Response(patched, response)

	// 新写法 ✅ 显式清除 Content-Encoding 和 Content-Length
	const newHeaders = new Headers(response.headers)
	newHeaders.delete('Content-Encoding')
	newHeaders.delete('Content-Length')
	return new Response(patched, {
	  status: response.status,
	  statusText: response.statusText,
	  headers: newHeaders,
	})

		

    
  }

  // ── POST：验证密码 ──
  if (request.method === 'POST') {
    const contentType = request.headers.get('Content-Type') || ''
    if (contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const input = form.get('password')?.toString() || ''

      if (input === password) {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': url.pathname + url.search,
            'Set-Cookie': `${COOKIE_NAME}=valid; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`,
          },
        })
      }

      return new Response(LOGIN_HTML('密码错误，请重试'), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }

  // ── GET：展示登录页 ──
  return new Response(LOGIN_HTML(''), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
