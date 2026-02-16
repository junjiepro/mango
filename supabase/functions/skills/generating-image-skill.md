---
name: 图片/视频生成
description: 使用 AI 生成图片或视频。当用户需要创建、绘制图片或生成视频时使用。
keywords: [图片, 视频, 生成, 绘制, 画, 图像, AI绘图, 动画]
triggers: [生成图片, 画一张, 创建图片, 绘制, 生成视频, 做个视频]
tags: [image, video, ai]
priority: 7
---

# 图片/视频生成

使用 AI 模型生成图片或视频。

## When to Use

- 用户说"生成一张xxx图片"、"画一张xxx"
- 用户说"帮我创建一个xxx图像"
- 用户描述想要的图片内容
- 用户说"生成一个xxx视频"、"做个xxx动画"

## Tools

### generating_image

生成 AI 图片或视频。

**Parameters:**
- `prompt` (string, required): 图片/视频描述
- `model` (string, optional): AI 模型
  - **图片模型**: flux (默认,高质量), zimage, turbo (快速), gptimage, kontext, seedream, seedream-pro, nanobanana, nanobanana-pro
  - **视频模型**: veo (文生视频), seedance/seedance-pro (文生视频+图生视频)
- `width` (number, optional): 图片宽度，默认 1024
- `height` (number, optional): 图片高度，默认 1024
- `seed` (number, optional): 随机种子，-1 为随机
- `enhance` (boolean, optional): AI 优化提示词
- `negative_prompt` (string, optional): 负面提示词，避免生成的内容
- `safe` (boolean, optional): 启用安全过滤
- `quality` (string, optional): 图片质量 (仅 gptimage): low/medium/high/hd
- `transparent` (boolean, optional): 透明背景 (仅 gptimage)
- `image` (string, optional): 参考图片 URL，多个用逗号分隔
- `duration` (number, optional): 视频时长秒数 (veo: 4/6/8, seedance: 2-10)
- `aspectRatio` (string, optional): 视频宽高比: 16:9 或 9:16
- `audio` (boolean, optional): 生成音频 (仅 veo)

**Returns:** 图片/视频 URL

## Model Selection Guide

| 需求 | 推荐模型 |
|------|---------|
| 高质量图片 | flux |
| 快速生成 | turbo, zimage |
| GPT 风格 | gptimage |
| 透明背景 | gptimage (transparent=true) |
| 图片编辑/参考 | kontext |
| 高质量视频 | veo |
| 图生视频 | seedance |

## Examples

用户: "生成一张日落海滩的图片"
调用: `generating_image({ prompt: '日落海滩，金色阳光，海浪' })`

用户: "用 turbo 模型快速画一只猫"
调用: `generating_image({ prompt: '可爱的猫咪', model: 'turbo' })`

用户: "生成一个 8 秒的海浪视频"
调用: `generating_image({ prompt: '海浪拍打沙滩', model: 'veo', duration: 8 })`

用户: "把这张图片变成视频"
调用: `generating_image({ prompt: '动态效果', model: 'seedance', image: 'https://...', duration: 5 })`
