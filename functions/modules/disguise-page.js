/**
 * 伪装页面渲染模块
 * 当浏览器访问订阅链接时显示的伪装页面
 */

/**
 * 渲染默认伪装页面
 * @returns {Response} HTML响应
 */
export function renderDisguisePage() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 Not Found</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-center;
            padding: 20px;
        }
        
        .container {
            text-align: center;
            color: white;
            max-width: 600px;
        }
        
        .error-code {
            font-size: 120px;
            font-weight: bold;
            line-height: 1;
            margin-bottom: 20px;
            text-shadow: 0 4px 20px rgba(0,0,0,0.2);
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-20px);
            }
        }
        
        h1 {
            font-size: 32px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        
        p {
            font-size: 18px;
            opacity: 0.9;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        .home-link {
            display: inline-block;
            padding: 12px 32px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .home-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        
        @media (max-width: 768px) {
            .error-code {
                font-size: 80px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            p {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">404</div>
        <h1>页面未找到</h1>
        <p>抱歉,您访问的页面不存在或已被删除。</p>
        <a href="/" class="home-link">返回首页</a>
    </div>
</body>
</html>
    `;

    return new Response(html, {
        status: 404,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
        }
    });
}
