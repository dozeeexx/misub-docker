<template>
  <div class="not-found-container">
    <div class="shape shape-1"></div>
    <div class="shape shape-2"></div>
    
    <div class="glass-card">
      <div class="error-code">404</div>
      <h1>页面未找到</h1>
      <p>抱歉，您访问的页面不存在或已被移除。<br>仿佛进入了数字荒原。</p>
      <router-link to="/" class="home-link">返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
// No script needed for this simple view
</script>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh; /* Full viewport height */
  width: 100vw;      /* Full viewport width */
  position: fixed;   /* Fix to cover everything including header/footer if needed */
  top: 0;
  left: 0;
  z-index: 9999;     /* Ensure it's on top */
  overflow: hidden;
  color: white; 
  /* Gradient Background from server-side template */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 
 * We use fixed styles here to ensure it looks good regardless of the theme, 
 * matching the server-side generated 404 page. 
 */

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.6;
  animation: pulse 10s infinite alternate;
}

.shape-1 {
  top: 10%;
  left: 10%;
  width: 300px;
  height: 300px;
  background: #43e97b;
}

.shape-2 {
  bottom: 10%;
  right: 10%;
  width: 400px;
  height: 400px;
  background: #fa709a;
  animation-delay: -5s;
}

.glass-card {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 4rem 2rem;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  text-align: center;
  max-width: 600px;
  width: 90%;
  animation: fadeInUp 0.8s ease-out;
}

.error-code {
  font-size: 100px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 1rem;
  background: linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.5));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.2));
  animation: float 6s ease-in-out infinite;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: white;
}

p {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 2.5rem;
  line-height: 1.6;
  color: white;
}

.home-link {
  display: inline-flex;
  align-items: center;
  padding: 14px 36px;
  background: #ffffff;
  color: #764ba2;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.home-link:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  background: #f8f9fa;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(1.2); opacity: 0.7; }
}

/* Media Queries */
@media (max-width: 768px) {
  .error-code { font-size: 70px; }
  h1 { font-size: 1.5rem; }
  .glass-card { padding: 3rem 1.5rem; }
}
</style>
