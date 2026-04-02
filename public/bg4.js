/**
 * 动态背景：频谱柱状图（中间留10px空白版）
 * 接口规范：暴露 init 函数，接收 canvas 元素和 audioAnalyser
 * 功能特性：
 * 1. 条柱从画布中间向左右两侧扩散，中间预留10px空白间距
 * 2. 单根条柱宽度缩窄，视觉整洁无重叠
 * 3. 仅初始化时随机一次颜色，全程保持渐变色彩不变
 */
export const SpectrumBarBg = {
    init(canvas, audioAnalyser) {
        const ctx = canvas.getContext('2d');
        let animationId = null;

        // 初始化时随机生成一次颜色（全程不变）
        const startHue = Math.floor(Math.random() * 360);
        const endHue = (startHue + Math.floor(Math.random() * 120) + 60) % 360;
        const saturation = 70 + Math.floor(Math.random() * 30);
        const lightness = 50 + Math.floor(Math.random() * 20);

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

            // 核心配置
            const barWidthScale = 2; // 柱子宽度缩放因子，越小越细
            const canvasMid = canvas.width / 2; // 画布中线
            const middleGap = 5; // 中间预留的空白宽度（10px）
            const halfGap = middleGap / 2; // 中线左右各分5px空白
            const barWidth = (canvas.width / bufferLength) * barWidthScale / 2; // 左右分摊宽度，避免溢出
            const barGap = 2; // 柱子之间的间距

            // 从中间向左右两侧绘制条柱（中间留10px空白）
            dataArray.forEach((value, index) => {
                const barHeight = (value / 255) * (canvas.height / 2);
                const offsetX = index * (barWidth + barGap); // 从中间向外的偏移量

                // 复用固定渐变色
                const gradient = ctx.createLinearGradient(
                    0, canvas.height/2 - barHeight/2,
                    0, canvas.height/2 + barHeight/2
                );
                gradient.addColorStop(0, `hsl(${startHue}, ${saturation}%, ${lightness}%)`);
                gradient.addColorStop(1, `hsl(${endHue}, ${saturation}%, ${lightness}%)`);
                ctx.fillStyle = gradient;

                // ========== 核心修改：左右两侧条柱各偏移5px，实现中间10px空白 ==========
                // 左侧条柱：中线向左偏移（offsetX + 柱子宽度 + 5px空白）
                const leftX = canvasMid - offsetX - barWidth - halfGap;
                ctx.fillRect(leftX, canvas.height/2 - barHeight/2, barWidth, barHeight);

                // 右侧条柱：中线向右偏移（offsetX + 5px空白）
                const rightX = canvasMid + offsetX + halfGap;
                ctx.fillRect(rightX, canvas.height/2 - barHeight/2, barWidth, barHeight);
            });

            animationId = requestAnimationFrame(draw);
        };

        draw();

        // 返回销毁函数
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }
};