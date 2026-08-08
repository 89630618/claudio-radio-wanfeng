from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "photos" / "claudio-core-implementation-architecture-refined-2026-08.png"

W, H = 1600, 1900
BG = "#101011"
GRID = "#151516"
INK = "#EDE8DE"
MUTED = "#A7A19A"
DIM = "#77736E"
ARROW = "#625E59"
GOLD = "#C6A46A"
# Three restrained layer colors: input, local core, and delivery.
INPUT = "#4C6681"
INPUT_FILL = "#17212B"
CORE = "#745342"
CORE_FILL = "#241A17"
GREEN = "#426A57"
GREEN_FILL = "#14231C"
ROSE = "#8D5156"


def font(size, bold=False, mono=False):
    choices = (
        [r"C:\Windows\Fonts\consolab.ttf", r"C:\Windows\Fonts\consola.ttf"]
        if mono
        else [
            r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
            r"C:\Windows\Fonts\Dengb.ttf" if bold else r"C:\Windows\Fonts\Deng.ttf",
        ]
    )
    for choice in choices:
        if Path(choice).exists():
            return ImageFont.truetype(choice, size)
    return ImageFont.load_default()


def txt(draw, xy, value, size, color=INK, bold=False, mono=False, anchor=None):
    draw.text(xy, value, font=font(size, bold, mono), fill=color, anchor=anchor)


def fit_txt(draw, xy, value, size, max_width, color=INK, bold=False, mono=False, min_size=11):
    """Draw one line without letting long API names escape their card."""
    current = size
    while current > min_size:
        box = draw.textbbox((0, 0), value, font=font(current, bold, mono))
        if box[2] - box[0] <= max_width:
            break
        current -= 1
    txt(draw, xy, value, current, color, bold, mono)


def card(draw, xy, kicker, title, lines, accent, fill):
    x1, y1, x2, y2 = xy
    compact = y2 - y1 <= 130
    title_size = 19 if compact else 23
    line_size = 14 if compact else 16
    line_gap = 17 if compact else 24
    draw.rounded_rectangle(xy, radius=10, fill=fill, outline=accent, width=2)
    txt(draw, (x1 + 20, y1 + 16), kicker, 14, accent, True, True)
    fit_txt(draw, (x1 + 20, y1 + 44), title, title_size, x2 - x1 - 40, INK, True, min_size=15)
    y = y1 + (72 if compact else 80)
    for line in lines:
        fit_txt(draw, (x1 + 20, y), line, line_size, x2 - x1 - 40, MUTED, min_size=10)
        y += line_gap


def layer(draw, y, name, desc):
    txt(draw, (58, y), name, 19, INK, True)
    txt(draw, (58, y + 27), desc, 15, DIM)
    draw.line((58, y + 58, 132, y + 58), fill=ROSE, width=2)


def down(draw, y1, y2):
    x = W // 2
    draw.line((x, y1, x, y2 - 15), fill=ARROW, width=3)
    draw.polygon([(x, y2), (x - 9, y2 - 17), (x + 9, y2 - 17)], fill=ARROW)


def right(draw, x1, y, x2, color=ARROW):
    draw.line((x1, y, x2 - 15, y), fill=color, width=3)
    draw.polygon([(x2, y), (x2 - 17, y - 9), (x2 - 17, y + 9)], fill=color)


def main():
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    for x in range(0, W, 36):
        draw.line((x, 0, x, H), fill=GRID, width=1)
    for y in range(0, H, 36):
        draw.line((0, y, W, y), fill=GRID, width=1)

    txt(draw, (W // 2, 53), "Claudio 的施工图", 43, INK, False, False, "ma")
    txt(draw, (W // 2, 105), "给 Codex 的最小实施架构 · 先能稳定播放，再让主持人有品味", 18, MUTED, False, False, "ma")
    draw.rounded_rectangle((315, 145, 1285, 193), radius=12, fill="#231E15", outline="#5F4D31", width=2)
    txt(draw, (W // 2, 159), "个人电台 · 用户说一句话 -> 锁定可播放歌曲 -> 生成 DJ 台词 -> 语音与页面同步", 17, GOLD, True, False, "ma")

    layer(draw, 250, "第一层", "外部上下文")
    card(draw, (200, 235, 775, 370), "USER / STYLE", "提供品味方向", ["本地口味档案 · persona · 正向 few-shot", "决定推荐与串词的审美边界"], INPUT, INPUT_FILL)
    card(draw, (825, 235, 1400, 370), "MUSIC / PLAYBACK", "提供真实可播放的歌", ["KuGou API · 本地代理", "远程音频优先 · 本地文件降级"], INPUT, INPUT_FILL)
    card(draw, (200, 395, 775, 530), "SIGNALS / STATE", "提供选歌依据", ["偏好 · 播放历史 · 时间/天气 · SQLite", "影响选歌节奏，不直接写进台词"], INPUT, INPUT_FILL)
    card(draw, (825, 395, 1400, 530), "MODEL / VOICE", "提供生成与发声能力", ["DJ：OpenAI-compatible API · gpt-5.6-terra", "Chat：DeepSeek v4-flash · TTS：Fish s2.1-pro"], INPUT, INPUT_FILL)
    down(draw, 554, 600)

    layer(draw, 620, "第二层", "本地电台核心")
    card(draw, (200, 605, 425, 750), "ROUTER", "判断用户意图", ["chat / direct", "queue / playlist"], CORE, CORE_FILL)
    card(draw, (445, 605, 670, 750), "RADIO", "锁定可播放歌曲", ["候选 · 冷却 · 去重", "songId 由本地系统锁定"], CORE, CORE_FILL)
    card(draw, (690, 605, 915, 750), "DJ", "生成主持人口吻", ["正向 few-shot 范式", "最小 prompt · 只读锁歌"], CORE, CORE_FILL)
    card(draw, (935, 605, 1160, 750), "GUARD", "保证输出可执行", ["strict JSON 校验", "锁歌 · 解析失败降级"], CORE, CORE_FILL)
    card(draw, (1180, 605, 1400, 750), "DELIVERY", "同步到声音和页面", ["TTS · now playing", "SSE · PWA"], CORE, CORE_FILL)
    down(draw, 773, 820)

    layer(draw, 842, "第三层", "运行时聚合")
    draw.rounded_rectangle((200, 827, 1400, 1360), radius=14, fill="#151516", outline="#373634", width=2)
    txt(draw, (225, 850), "RUNTIME WINDOW / TWO CORE CONTRACTS", 15, MUTED, True, True)
    txt(draw, (225, 882), "先决定播什么，再决定怎么说。", 25, INK, True)

    card(draw, (225, 930, 495, 1040), "1. REQUEST", "接住用户需求", ["query / scene", "或当前播放动作"], CORE, "#1E1716")
    card(draw, (520, 930, 790, 1040), "2. RADIO", "先锁定要播的歌", ["可播放候选", "-> locked songId"], GREEN, GREEN_FILL)
    card(draw, (815, 930, 1085, 1040), "3. MODEL", "再生成怎么说", ["2–3 条正向范式", "-> strict JSON"], GOLD, "#251E13")
    card(draw, (1110, 930, 1375, 1040), "4. DELIVERY", "验证后统一发布", ["validate -> TTS", "-> now playing"], GREEN, GREEN_FILL)
    right(draw, 497, 985, 518, GREEN)
    right(draw, 792, 985, 813, GOLD)
    right(draw, 1087, 985, 1108, GREEN)

    draw.rounded_rectangle((225, 1080, 1375, 1188), radius=9, fill="#111F18", outline=GREEN, width=1)
    txt(draw, (245, 1097), "A / FAST PATH", 14, GREEN, True, True)
    txt(draw, (245, 1124), "POST /api/radio/next  ->  { songId, queue, reason }", 21, INK, True)
    txt(draw, (245, 1158), "不等待 LLM；返回前保证 songId 可播放。", 16, MUTED)

    draw.rounded_rectangle((225, 1210, 1375, 1318), radius=9, fill="#251E13", outline=GOLD, width=1)
    txt(draw, (245, 1227), "B / CREATION PATH", 14, GOLD, True, True)
    txt(draw, (245, 1254), "POST /api/dj/line  ->  { say, play:[songId], reason, segue }", 21, INK, True)
    txt(draw, (245, 1288), "只读取锁定歌曲和范式；解析失败也返回合法 JSON。", 16, MUTED)
    txt(draw, (225, 1335), "不变量：decision.play 只能包含当前候选或锁定曲目的 ID。", 16, ROSE, True)
    down(draw, 1380, 1425)

    layer(draw, 1445, "第四层", "交互与发布")
    card(draw, (200, 1430, 775, 1575), "PWA / REACT", "呈现完整电台体验", ["播放 · 队列 · 对话 · 偏好反馈", "台词、语音与 now playing 共享状态"], GREEN, GREEN_FILL)
    card(draw, (825, 1430, 1400, 1575), "HTTP + SSE", "提供同步接口", ["/api/chat · /api/radio/next · /api/dj/line", "/api/now · /api/now/stream"], GREEN, GREEN_FILL)

    draw.rounded_rectangle((200, 1640, 1400, 1745), radius=10, fill="#171717")
    txt(draw, (225, 1659), "IMPLEMENT IN THIS ORDER", 14, GOLD, True, True)
    txt(draw, (225, 1697), "曲库与播放  ->  Radio 决策  ->  锁歌 DJ JSON  ->  校验/TTS/now  ->  PWA 与 SSE", 22, INK, True)
    txt(draw, (W // 2, 1822), "当前正式功能的最小抽象 · 不包含歌词、热评、故事卡或未来 scheduler。", 16, DIM, False, False, "ma")

    image.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
