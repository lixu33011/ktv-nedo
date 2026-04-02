/**
 * 动态背景：频谱柱状图（优化版）
 * 接口规范：暴露 init 函数，接收 canvas 元素和 audioAnalyser
 * 功能升级：
 * 1. 频谱从0位置开始、顶满画布右侧结束
 * 2. 缩小单根条柱宽度，解决中间镜像重叠问题
 * 3. 仅初始化时随机一次颜色，全程保持该渐变色彩不变
 */
export const SpectrumBarBg = {
    init(canvas, audioAnalyser) {
        const ctx = canvas.getContext('2d');
        let animationId = null;

        // ========== 核心修改1：初始化时随机生成一次颜色（全程不变） ==========
        // 采用HSL颜色空间，生成和谐且固定的渐变色
        const startHue = Math.floor(Math.random() * 360);
        const endHue = (startHue + Math.floor(Math.random() * 120) + 60) % 360;
        const saturation = 70 + Math.floor(Math.random() * 30); // 饱和度 70% ~ 100%
        const lightness = 50 + Math.floor(Math.random() * 20);  // 亮度 50% ~ 70%

        // 适配画布大小
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // 绘制逻辑
        const draw = () => {
            if (!audioAnalyser) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            const bufferLength = audioAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            audioAnalyser.getByteFrequencyData(dataArray);

            // 清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // ========== 核心修改2：缩小单根条柱宽度（解决镜像重叠） ==========
            // 降低柱子宽度缩放系数（从2.5改为1.2，可按需微调，数值越小柱子越细）
            const barWidthScale = 2.1; // 单根柱子宽度缩放因子，<2.5 实现缩窄效果
            const barWidth = (canvas.width / bufferLength) * barWidthScale; // 基于画布全宽计算，从0位置开始
            let x = 0;
            const canvasMid = canvas.width / 2; // 画布中线（镜像对称轴）

            // 第一步：绘制左侧原始频谱柱（从x=0开始，不偏移，柱子缩窄）
            dataArray.forEach(value => {
                const barHeight = (value / 255) * (canvas.height / 2);
                // 复用初始化时生成的固定渐变色（全程不变）
                const gradient = ctx.createLinearGradient(
                    0, canvas.height/2 - barHeight/2,
                    0, canvas.height/2 + barHeight/2
                );
                gradient.addColorStop(0, `hsl(${startHue}, ${saturation}%, ${lightness}%)`);
                gradient.addColorStop(1, `hsl(${endHue}, ${saturation}%, ${lightness}%)`);
                ctx.fillStyle = gradient;
                
                // 从0位置开始绘制，不添加任何偏移
                ctx.fillRect(x, canvas.height/2 - barHeight/2, barWidth, barHeight);
                x += barWidth + 1; // 间距保持1px，柱子缩窄后重叠风险降低
            });

            // 第二步：绘制右侧镜像频谱柱（顶满画布右侧，解决中间重叠）
            x = 0; // 重置x坐标，同步左侧计算
            dataArray.forEach(value => {
                const barHeight = (value / 255) * (canvas.height / 2);
                // 复用初始化时的固定渐变色
                const gradient = ctx.createLinearGradient(
                    0, canvas.height/2 - barHeight/2,
                    0, canvas.height/2 + barHeight/2
                );
                gradient.addColorStop(0, `hsl(${startHue}, ${saturation}%, ${lightness}%)`);
                gradient.addColorStop(1, `hsl(${endHue}, ${saturation}%, ${lightness}%)`);
                ctx.fillStyle = gradient;
                
                // ========== 优化镜像坐标：避免中线重叠，顶满右侧画布 ==========
                // 计算逻辑：中线 + （中线 - 柱子右侧边缘），确保不跨中线重叠，且撑满右侧
                const mirrorX = canvasMid + (canvasMid - (x + barWidth));
                ctx.fillRect(mirrorX, canvas.height/2 - barHeight/2, barWidth, barHeight);
                x += barWidth + 1;
            });

            animationId = requestAnimationFrame(draw);
        };

        draw();

        // 返回销毁函数（停止动画）
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }
};