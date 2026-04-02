/**
 * 动态背景：粒子波动（增强版）
 * 功能升级：
 * 1. 多个不同大小的圆形粒子
 * 2. 每个粒子颜色唯一，随音频律动动态变化
 */
export const ParticleWaveBg = {
    init(canvas, audioAnalyser) {
        const ctx = canvas.getContext('2d');
        const particles = [];
        let animationId = null;

        // 初始化粒子（扩展：不同大小 + 唯一颜色属性）
        const initParticles = () => {
            particles.length = 0;
            const count = 100; // 粒子总数，可调整
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    // 核心修改1：扩大大小随机范围，实现不同大小的圆（2~10px，差异更明显）
                    size: Math.random() * 8 + 2, 
                    speed: Math.random() * 0.5 + 0.1,
                    phase: Math.random() * Math.PI * 2,
                    // 核心修改2：每个粒子分配唯一的基础颜色参数（HSL，保证色彩和谐）
                    hue: Math.floor(Math.random() * 360), // 唯一色相（0~359）
                    saturation: 70 + Math.floor(Math.random() * 20), // 饱和度（70%~90%）
                    lightness: 40 + Math.floor(Math.random() * 20)  // 亮度（40%~60%）
                });
            }
        };

        // 适配大小
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };
        resize();
        window.addEventListener('resize', resize);

        // 绘制（核心：颜色随律动变化 + 不同大小粒子渲染）
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 获取音频数据（控制粒子波动与颜色变化）
            let energy = 0;
            if (audioAnalyser) {
                const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
                audioAnalyser.getByteFrequencyData(dataArray);
                // 计算平均能量（0~1之间）
                energy = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;
            }

            // 绘制粒子（每个粒子唯一颜色，随律动动态变化）
            particles.forEach(particle => {
                // 随音频能量波动（原有逻辑保留）
                const wave = Math.sin(Date.now() * 0.001 + particle.phase) * energy * 50;
                particle.y += particle.speed + wave * 0.1;
                if (particle.y > canvas.height) particle.y = 0;

                // 核心修改3：随音频律动动态调整颜色（每个粒子唯一且随能量变化）
                // 1. 能量越高，透明度越高（更亮）；能量越低，越暗淡
                const alpha = Math.min(0.9, 0.4 + energy * 0.5);
                // 2. 基于粒子唯一色相，随能量轻微偏移（律动时颜色微变，更生动）
                const dynamicHue = (particle.hue + energy * 60) % 360;
                // 3. 拼接最终颜色（HSL + 透明度），每个粒子颜色不同且随律动变化
                const particleColor = `hsla(${dynamicHue}, ${particle.saturation}%, ${particle.lightness}%, ${alpha})`;

                // 绘制不同大小的圆形粒子
                ctx.beginPath();
                ctx.arc(particle.x, particle.y + wave, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particleColor;
                ctx.fill();
            });

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }
};