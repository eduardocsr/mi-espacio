import zlib
import struct
import math
import os

def sd_rounded_box(px, py, bx, by, r):
    qx = abs(px) - bx + r
    qy = abs(py) - by + r
    inside = min(max(qx, qy), 0.0)
    outside = math.sqrt(max(qx, 0.0)**2 + max(qy, 0.0)**2)
    return inside + outside - r

def blend(src_c, src_a, dst_c, dst_a):
    out_a = src_a + dst_a * (1.0 - src_a)
    if out_a <= 0:
        return (0.0, 0.0, 0.0, 0.0)
    out_r = (src_c[0] * src_a + dst_c[0] * dst_a * (1.0 - src_a)) / out_a
    out_g = (src_c[1] * src_a + dst_c[1] * dst_a * (1.0 - src_a)) / out_a
    out_b = (src_c[2] * src_a + dst_c[2] * dst_a * (1.0 - src_a)) / out_a
    return ((out_r, out_g, out_b), out_a)

def render_bento_icon(size):
    # Normalized coordinates based on 48x48 design
    # Scale factor
    scale = size / 48.0
    
    # Shapes in 48x48:
    # Outer rect: center (24, 24), size (46, 46) -> half (23, 23), r = 13, border = 1.5
    # Pillar: center (10 + 6, 10 + 14) = (16, 24), size (12, 28) -> half (6, 14), r = 4
    # Top-right: center (25 + 6.5, 10 + 6) = (31.5, 16), size (13, 12) -> half (6.5, 6), r = 4
    # Bottom-right: center (25 + 6.5, 25 + 6.5) = (31.5, 31.5), size (13, 13) -> half (6.5, 6.5), r = 4

    c_outer_bg = (250/255, 247/255, 245/255)
    c_outer_border = (234/255, 226/255, 222/255)
    c_pillar = (116/255, 86/255, 110/255)
    c_coral = (201/255, 125/255, 96/255)
    c_tinted = (116/255, 86/255, 110/255)
    tinted_alpha = 0.28

    pixels = []
    
    # 4x4 supersampling for antialiasing
    samples = 4
    sub_step = 1.0 / samples
    sub_weight = 1.0 / (samples * samples)

    for y in range(size):
        row = []
        for x in range(size):
            accum_r, accum_g, accum_b, accum_a = 0.0, 0.0, 0.0, 0.0
            for sy in range(samples):
                py = (y + (sy + 0.5) * sub_step) / scale
                for sx in range(samples):
                    px = (x + (sx + 0.5) * sub_step) / scale
                    
                    # 1. Outer box
                    d_box = sd_rounded_box(px - 24, py - 24, 23, 23, 13)
                    cov_box = max(0.0, min(1.0, 0.5 - d_box))
                    
                    if cov_box <= 0:
                        continue
                    
                    # Border: stroke-width 1.5 -> stroke boundary is d_box around 0
                    # Inside of border: d_box from -1.5 to 0
                    border_factor = max(0.0, min(1.0, 1.5 - abs(d_box + 0.75)))
                    
                    cur_c = c_outer_bg
                    cur_a = 1.0
                    
                    # Blend border
                    border_cov = max(0.0, min(1.0, 0.75 - abs(d_box + 0.75)))
                    if d_box > -1.5:
                        # outer border region
                        t = max(0.0, min(1.0, (d_box + 1.5) / 1.5))
                        cur_c = (
                            cur_c[0] * (1 - t) + c_outer_border[0] * t,
                            cur_c[1] * (1 - t) + c_outer_border[1] * t,
                            cur_c[2] * (1 - t) + c_outer_border[2] * t,
                        )
                    
                    # 2. Left pillar
                    d_pillar = sd_rounded_box(px - 16, py - 24, 6, 14, 4)
                    cov_pillar = max(0.0, min(1.0, 0.5 - d_pillar))
                    if cov_pillar > 0:
                        cur_c, cur_a = blend(c_pillar, cov_pillar, cur_c, cur_a)
                    
                    # 3. Top-right block
                    d_tr = sd_rounded_box(px - 31.5, py - 16, 6.5, 6, 4)
                    cov_tr = max(0.0, min(1.0, 0.5 - d_tr))
                    if cov_tr > 0:
                        cur_c, cur_a = blend(c_coral, cov_tr, cur_c, cur_a)
                    
                    # 4. Bottom-right block
                    d_br = sd_rounded_box(px - 31.5, py - 31.5, 6.5, 6.5, 4)
                    cov_br = max(0.0, min(1.0, 0.5 - d_br))
                    if cov_br > 0:
                        cur_c, cur_a = blend(c_tinted, cov_br * tinted_alpha, cur_c, cur_a)
                    
                    final_a = cur_a * cov_box
                    accum_r += cur_c[0] * final_a * sub_weight
                    accum_g += cur_c[1] * final_a * sub_weight
                    accum_b += cur_c[2] * final_a * sub_weight
                    accum_a += final_a * sub_weight
            
            if accum_a > 0.001:
                r_byte = int(round(min(255, max(0, accum_r / accum_a * 255))))
                g_byte = int(round(min(255, max(0, accum_g / accum_a * 255))))
                b_byte = int(round(min(255, max(0, accum_b / accum_a * 255))))
                a_byte = int(round(min(255, max(0, accum_a * 255))))
            else:
                r_byte, g_byte, b_byte, a_byte = 0, 0, 0, 0
            
            row.extend([r_byte, g_byte, b_byte, a_byte])
        pixels.append(bytes(row))
    return pixels

def make_png(size, pixel_rows):
    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    ihdr = b'IHDR' + ihdr_data
    ihdr_crc = struct.pack(">I", zlib.crc32(ihdr) & 0xffffffff)
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + ihdr + ihdr_crc

    # IDAT (filter byte 0 per row)
    raw_idat = bytearray()
    for row in pixel_rows:
        raw_idat.append(0)
        raw_idat.extend(row)
    compressed_idat = zlib.compress(bytes(raw_idat), 9)
    idat = b'IDAT' + compressed_idat
    idat_crc = struct.pack(">I", zlib.crc32(idat) & 0xffffffff)
    idat_chunk = struct.pack(">I", len(compressed_idat)) + idat + idat_crc

    # IEND
    iend = b'IEND'
    iend_crc = struct.pack(">I", zlib.crc32(iend) & 0xffffffff)
    iend_chunk = struct.pack(">I", 0) + iend + iend_crc

    png_header = b'\x89PNG\r\n\x1a\n'
    return png_header + ihdr_chunk + idat_chunk + iend_chunk

def make_ico(png_list):
    # png_list is list of (width, height, png_bytes)
    num_images = len(png_list)
    header = struct.pack("<HHH", 0, 1, num_images)
    
    entries = []
    offset = 6 + 16 * num_images
    data_blobs = []
    
    for w, h, data in png_list:
        b_w = 0 if w >= 256 else w
        b_h = 0 if h >= 256 else h
        size = len(data)
        entry = struct.pack("<BBBBHHII", b_w, b_h, 0, 0, 1, 32, size, offset)
        entries.append(entry)
        data_blobs.append(data)
        offset += size
        
    return header + b"".join(entries) + b"".join(data_blobs)

def main():
    sizes = [16, 32, 48, 64, 180, 192]
    png_by_size = {}
    print("Rendering icon sizes...")
    for s in sizes:
        print(f"  Rendering {s}x{s}...")
        pixels = render_bento_icon(s)
        png_by_size[s] = make_png(s, pixels)

    # Save PNG files to public/
    os.makedirs("public", exist_ok=True)
    os.makedirs("src", exist_ok=True)
    
    with open("public/favicon-16x16.png", "wb") as f:
        f.write(png_by_size[16])
    with open("public/favicon-32x32.png", "wb") as f:
        f.write(png_by_size[32])
    with open("public/favicon-48x48.png", "wb") as f:
        f.write(png_by_size[48])
    with open("public/apple-touch-icon.png", "wb") as f:
        f.write(png_by_size[180])
    with open("public/android-chrome-192x192.png", "wb") as f:
        f.write(png_by_size[192])

    # Also copy to src/
    with open("src/favicon-16x16.png", "wb") as f:
        f.write(png_by_size[16])
    with open("src/favicon-32x32.png", "wb") as f:
        f.write(png_by_size[32])
    with open("src/apple-touch-icon.png", "wb") as f:
        f.write(png_by_size[180])

    # Generate multi-res ICO (16, 32, 48)
    ico_bytes = make_ico([
        (16, 16, png_by_size[16]),
        (32, 32, png_by_size[32]),
        (48, 48, png_by_size[48]),
    ])
    with open("public/favicon.ico", "wb") as f:
        f.write(ico_bytes)
    with open("src/favicon.ico", "wb") as f:
        f.write(ico_bytes)

    print("Successfully generated favicon.ico, PNGs, and apple-touch-icon!")

if __name__ == "__main__":
    main()
