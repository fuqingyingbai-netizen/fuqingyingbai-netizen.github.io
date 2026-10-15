"""Render text-and-flow project illustrations; requires Pillow and a CJK font."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CARDS = {
    "site": ("沈郑毅的学习与实践", "把学到的知识写下来，把做过的项目讲清楚。", ["学习笔记", "项目实践", "随笔记录"]),
    "resume-evaluator-agent": ("AI 简历评估助手", "从对话入口到工作流调用", ["简历输入", "对话 Agent", "Coze 工作流", "评估报告"]),
    "dify-apps": ("Dify 应用集合", "三个场景，三种应用组织方式", ["出题组卷", "知识库客服", "竞品情报分析"]),
    "shopkeeper-agent": ("电商问数 Agent", "开源教程项目的学习与工程实践", ["混合检索", "SQL 生成与校验", "查询与流式返回"]),
}


def render(name, title, subtitle, steps, font_path):
    image = Image.new("RGB", (1200, 630), "#edf4f2")
    draw = ImageDraw.Draw(image)
    font = lambda size: ImageFont.truetype(str(font_path), size)
    accent, ink, muted = "#245d65", "#193d43", "#546e73"
    draw.rounded_rectangle((42, 36, 1158, 594), radius=26, outline="#c6d9d4", width=2)
    draw.text((76, 65), "学习 · 实践 · 记录", font=font(24), fill=accent)
    draw.text((76, 135), title, font=font(58), fill=ink)
    draw.text((78, 223), subtitle, font=font(28), fill=muted)
    gap, left, width = 28, 76, 1048
    node_width = (width - gap * (len(steps) - 1)) / len(steps)
    for index, label in enumerate(steps):
        x = left + index * (node_width + gap)
        draw.rounded_rectangle((x, 332, x + node_width, 440), radius=16, fill="#ffffff", outline="#bfd5ce", width=2)
        label_font = font(27 if len(steps) < 4 else 25)
        bbox = draw.textbbox((0, 0), label, font=label_font)
        draw.text((x + (node_width - (bbox[2] - bbox[0])) / 2, 366), label, font=label_font, fill=ink)
        if index < len(steps) - 1:
            arrow = x + node_width + gap / 2
            draw.line((arrow - 8, 386, arrow + 8, 386), fill=accent, width=3)
            draw.line((arrow + 2, 380, arrow + 8, 386, arrow + 2, 392), fill=accent, width=3)
    draw.text((78, 505), "沈郑毅 · 浙江理工大学人工智能硕士研究生", font=font(23), fill=muted)
    draw.text((78, 548), "fuqingyingbai-netizen.github.io", font=font(20), fill=muted)
    if name != "site":
        draw.text((999, 548), "流程示意", font=font(20), fill=muted)
    target = ROOT / "assets/img/covers" / f"{name}.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)
    print(f"{target.relative_to(ROOT)}: {target.stat().st_size} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", type=Path, default=Path("C:/Windows/Fonts/msyh.ttc"))
    options = parser.parse_args()
    if not options.font.is_file():
        parser.error("Pass --font with an available CJK font file")
    for name, (title, subtitle, steps) in CARDS.items():
        render(name, title, subtitle, steps, options.font)
