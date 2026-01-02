"""
pip install Pillow click
"""

import os

import click
from PIL import Image


@click.command()
@click.argument('filenames', nargs=-1, type=click.Path(exists=True))
@click.option('-m', '--margin', 'margin', type=int, default=0,
              help='图片之间的水平间距 (像素)。默认为 0。', show_default=True)
@click.option('-o', '--output', 'output_filename', default='stitched_image.png',
              help='拼接后的输出文件名。默认为 stitched_image.png。', show_default=True)
@click.option('-b', '--black', 'use_black', default=False, type=click.BOOL, is_flag=True,
              help='是否使用黑色背景，默认为否', show_default=True)
def stitch_images(filenames, margin, output_filename, use_black):
    """
    加载并水平拼接命令行中指定的图片。

    Args:
        filenames (list): 待拼接的图片文件路径列表。
    """
    if not filenames:
        print("错误：请提供至少一个图片文件名作为命令行参数。")
        print("用法: python image_stitcher.py <file1.jpg> <file2.png> ...")
        return

    images = []

    # 1. 加载所有图片并计算总尺寸
    print("正在加载图片...")
    for filename in filenames:
        if not os.path.exists(filename):
            print(f"警告: 文件不存在，已跳过: {filename}")
            continue

        try:
            img = Image.open(filename).convert("RGBA")  # 转换为 RGBA 以保留透明度
            images.append(img)
            w, h = img.size
        except IOError:
            print(f"警告: 无法打开或识别图片文件，已跳过: {filename}")
        except Exception as e:
            print(f"警告: 处理文件时发生意外错误，已跳过: {filename}, 错误: {e}")

    if not images:
        print("错误: 未找到任何可加载的图片。")
        return

    max_width = min(1440 - 2 * margin, max([img.width for img in images]))
    heights = [int(img.height * max_width / img.width) for img in images]
    total_width = max_width + 2 * margin
    total_height = sum(heights) + (len(images) + 1) * margin

    # 2. 创建新的画布
    # 默认使用白色背景 (255, 255, 255)
    bg_color = (255, 255, 255, 255)
    if use_black:
        bg_color = (0, 0, 0, 255)
    stitched_image = Image.new('RGBA', (total_width, total_height), bg_color)

    # 3. 拼接图片
    print(f"正在拼接 {len(images)} 张图片...")
    current_y = margin
    for i, img in enumerate(images):
        # 将图片粘贴到画布上，从 current_x 位置开始，y 坐标居中对齐（可选）
        resized = img.resize((max_width, heights[i]))
        stitched_image.paste(resized, (margin, current_y))
        current_y += heights[i] + margin

    # 4. 保存结果
    try:
        stitched_image.save(output_filename)
        print(f"\n拼接完成！结果已保存到: {output_filename}")
        print(f"最终图片尺寸: {total_width}x{total_height}")
    except Exception as e:
        print(f"保存图片失败: {e}")


if __name__ == "__main__":
    # 使用 click 启动命令行应用
    stitch_images()
