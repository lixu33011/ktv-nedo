/**
 * 动态背景：渐变流动（超动效版）
 * 功能升级：
 * 1. 大幅增强圆的跳动力度，律动反馈更明显
 * 2. 增加颜色随机多样性，律动时颜色变化更丰富
 * 3. 中心圆同步增强颜色随机+跳动呼应
 * 4. 保留所有核心视觉层次，不破坏整体风格
 */
export const GradientFlowBg = {
    init(canvas, audioAnalyser) {
        const ctx = canvas.getContext('2d');
        let animationId = null;
        const circles = [];
        // 中心圆基础随机色（保留唯一性，增加律动随机空间）
        const centerHue = Math.floor(Math.random() * 560);
        const centerSaturation = 70 + Math.floor(Math.random() * 90);
        const centerLightness = 45 + Math.floor(Math.random() * 30);

        // 初始化多个圆（核心：增大跳动力度参数 + 预留颜色随机空间）
        const initCircles = () => {
            circles.length = 0;
            const circleCount = 100; // 圆的总数，可调整
            for (let i = 0; i < circleCount; i++) {
                circles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    baseSize: Math.random() * 40 + 30,
                    fluctuateRange: Math.random() * 20 + 15,
                    // ========== 核心修改1：增大跳动力度（基础幅度+能量放大） ==========
                    jumpRangeX: Math.random() * 25 + 95, // 跳动幅度从 5~20 → 15~40px，大幅增强
                    jumpRangeY: Math.random() * 25 + 95,
                    hue: Math.floor(Math.random() * 360),
                    saturation: 70 + Math.floor(Math.random() * 90),
                    lightness: 40 + Math.floor(Math.random() * 40),
                    phase: Math.random() * Math.PI * 2,
                    jumpPhaseX: Math.random() * Math.PI * 2,
                    jumpPhaseY: Math.random() * Math.PI * 2,
                    // 新增：颜色随机波动系数（每个圆独有，增强颜色多样性）
                    colorRandomFactor: Math.random() * 50 + 270
                });
            }
        };

        // 适配大小
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initCircles();
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. 保留原有：流动渐变背景
            const gradient = ctx.createLinearGradient(
                0, 0,
                canvas.width, canvas.height + Math.sin(Date.now() * 0.0005) * 100
            );
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(0.5, '#2d2d2d');
            gradient.addColorStop(1, '#1a1a1a');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. 音频数据处理（增强能量对律动的驱动权重）
            let energy = 0;
            if (audioAnalyser) {
                const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
                audioAnalyser.getByteFrequencyData(dataArray);
                energy = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;
                // 能量放大：增强高能量时的律动反馈（避免力度不足）
                energy = Math.pow(energy, 1.8) * 4.0;
            }

            // 3. 绘制多个：强跳动 + 高随机颜色的圆
            circles.forEach(circle => {
                // ① 大小律动：放大能量驱动权重，幅度更明显
                const dynamicSize = circle.baseSize + Math.sin(Date.now() * 0.001 + circle.phase) * circle.fluctuateRange * energy * 1.8;

                // ② 位置律动（核心：增强跳动幅度+频率，力度更足）
                // 提高跳动频率（0.002 → 0.003），跳动更急促，视觉力度更强
                const jumpX = Math.sin(Date.now() * 0.003 + circle.jumpPhaseX) * circle.jumpRangeX * energy;
                const jumpY = Math.sin(Date.now() * 0.003 + circle.jumpPhaseY) * circle.jumpRangeY * energy;
                const dynamicX = circle.x + jumpX;
                const dynamicY = circle.y + jumpY;

                // ========== 核心修改2：增加颜色随机多样性（多重随机，不局限于基础色相） ==========
                // 1. 基础色相偏移 + 能量驱动 + 帧内随机波动（每个帧颜色都有新变化）
                const baseHueOffset = energy * circle.colorRandomFactor;
                const frameRandomHue = Math.floor(Math.random() * 60); // 每帧额外随机色相（0~60）
                const dynamicHue = (circle.hue + baseHueOffset + frameRandomHue) % 360;

                // 2. 饱和度/亮度在基础值附近随机微调（不再固定，增加颜色层次感）
                const dynamicSaturation = Math.max(50, Math.min(100, circle.saturation + Math.floor(Math.random() * 10) - 5));
                const dynamicLightness = Math.max(30, Math.min(70, circle.lightness + Math.floor(Math.random() * 10) - 5));

                // 3. 透明度随能量变化，同时增加小幅随机（避免统一化）
                const alpha = Math.min(0.8, 0.2 + energy * 0.6 + Math.random() * 0.1);
                const circleColor = `hsla(${dynamicHue}, ${dynamicSaturation}%, ${dynamicLightness}%, ${alpha})`;

                // 绘制强律动+高随机颜色的圆
                ctx.beginPath();
                ctx.arc(dynamicX, dynamicY, dynamicSize / 2, 0, Math.PI * 2);
                ctx.fillStyle = circleColor;
                ctx.fill();
            });

            // 4. 中心圆：增强颜色随机 + 同步强律动
            if (audioAnalyser) {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                // 中心圆大小：放大能量驱动，幅度更明显
                const radius = 60 + energy * 250;

                // 中心圆颜色：增加多重随机，与其他圆风格统一
                const centerBaseOffset = energy * 95;
                const centerFrameRandom = Math.floor(Math.random() * 40);
                const centerDynamicHue = (centerHue + centerBaseOffset + centerFrameRandom) % 360;
                const centerDynamicSaturation = Math.max(60, Math.min(90, centerSaturation + Math.floor(Math.random() * 8) - 4));
                const centerDynamicLightness = Math.max(40, Math.min(60, centerLightness + Math.floor(Math.random() * 8) - 4));
                const centerAlpha = Math.min(0.25, 0.05 + energy * 0.2 + Math.random() * 0.05);
                const centerColor = `hsla(${centerDynamicHue}, ${centerDynamicSaturation}%, ${centerDynamicLightness}%, ${centerAlpha})`;

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fillStyle = centerColor;
                ctx.fill();
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }
};