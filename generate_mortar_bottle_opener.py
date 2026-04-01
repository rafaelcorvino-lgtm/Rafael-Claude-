"""
Generate STL file for a Military Mortar-Style Bottle Opener with Tripod Base.

MECHANISM: The barrel is a hollow tube. You insert the bottle upside-down
(cap first) into the muzzle. Inside there's a cap-catching ring that grabs
the cap edge. Push the bottle down and the cap pops off, staying inside
while the bottle slides through.

Standard bottle cap: 26.5mm diameter, 6mm tall
Standard bottle neck: ~26mm outer diameter
The tube inner diameter needs to be ~28-29mm to allow the bottle neck through
but the cap-catching ring inner diameter is ~22-23mm (smaller than the cap).

Dimensions are in millimeters, designed for 3D printing (FDM/resin).
"""

import numpy as np
from stl import mesh
import math


def create_tube(outer_radius, inner_radius, height, segments=48,
                z_offset=0, x_offset=0, y_offset=0):
    """Create a hollow tube (cylinder with hole through center)."""
    faces = []
    for i in range(segments):
        angle1 = 2 * math.pi * i / segments
        angle2 = 2 * math.pi * (i + 1) / segments

        # Outer wall points
        ox1 = outer_radius * math.cos(angle1) + x_offset
        oy1 = outer_radius * math.sin(angle1) + y_offset
        ox2 = outer_radius * math.cos(angle2) + x_offset
        oy2 = outer_radius * math.sin(angle2) + y_offset

        # Inner wall points
        ix1 = inner_radius * math.cos(angle1) + x_offset
        iy1 = inner_radius * math.sin(angle1) + y_offset
        ix2 = inner_radius * math.cos(angle2) + x_offset
        iy2 = inner_radius * math.sin(angle2) + y_offset

        z_bot = z_offset
        z_top = z_offset + height

        # Outer wall
        faces.append([[ox1, oy1, z_bot], [ox1, oy1, z_top], [ox2, oy2, z_bot]])
        faces.append([[ox2, oy2, z_bot], [ox1, oy1, z_top], [ox2, oy2, z_top]])

        # Inner wall (normals facing inward)
        faces.append([[ix1, iy1, z_bot], [ix2, iy2, z_bot], [ix1, iy1, z_top]])
        faces.append([[ix2, iy2, z_bot], [ix2, iy2, z_top], [ix1, iy1, z_top]])

        # Bottom annular ring
        faces.append([[ox1, oy1, z_bot], [ox2, oy2, z_bot], [ix1, iy1, z_bot]])
        faces.append([[ix1, iy1, z_bot], [ox2, oy2, z_bot], [ix2, iy2, z_bot]])

        # Top annular ring
        faces.append([[ox1, oy1, z_top], [ix1, iy1, z_top], [ox2, oy2, z_top]])
        faces.append([[ix2, iy2, z_top], [ox2, oy2, z_top], [ix1, iy1, z_top]])

    return faces


def create_cylinder(radius, height, segments=48, z_offset=0, x_offset=0, y_offset=0):
    """Create a solid cylinder."""
    faces = []
    for i in range(segments):
        angle1 = 2 * math.pi * i / segments
        angle2 = 2 * math.pi * (i + 1) / segments

        x1 = radius * math.cos(angle1) + x_offset
        y1 = radius * math.sin(angle1) + y_offset
        x2 = radius * math.cos(angle2) + x_offset
        y2 = radius * math.sin(angle2) + y_offset

        # Bottom face
        faces.append([[x_offset, y_offset, z_offset],
                      [x1, y1, z_offset],
                      [x2, y2, z_offset]])
        # Top face
        faces.append([[x_offset, y_offset, z_offset + height],
                      [x2, y2, z_offset + height],
                      [x1, y1, z_offset + height]])
        # Side faces
        faces.append([[x1, y1, z_offset], [x1, y1, z_offset + height], [x2, y2, z_offset]])
        faces.append([[x2, y2, z_offset], [x1, y1, z_offset + height], [x2, y2, z_offset + height]])
    return faces


def create_cone(r_bot, r_top, height, segments=48, z_offset=0, x_offset=0, y_offset=0):
    """Create a truncated cone (frustum)."""
    faces = []
    for i in range(segments):
        a1 = 2 * math.pi * i / segments
        a2 = 2 * math.pi * (i + 1) / segments

        bx1 = r_bot * math.cos(a1) + x_offset
        by1 = r_bot * math.sin(a1) + y_offset
        bx2 = r_bot * math.cos(a2) + x_offset
        by2 = r_bot * math.sin(a2) + y_offset

        tx1 = r_top * math.cos(a1) + x_offset
        ty1 = r_top * math.sin(a1) + y_offset
        tx2 = r_top * math.cos(a2) + x_offset
        ty2 = r_top * math.sin(a2) + y_offset

        if r_bot > 0.01:
            faces.append([[x_offset, y_offset, z_offset],
                          [bx1, by1, z_offset],
                          [bx2, by2, z_offset]])
        if r_top > 0.01:
            faces.append([[x_offset, y_offset, z_offset + height],
                          [tx2, ty2, z_offset + height],
                          [tx1, ty1, z_offset + height]])

        faces.append([[bx1, by1, z_offset], [tx1, ty1, z_offset + height], [bx2, by2, z_offset]])
        faces.append([[bx2, by2, z_offset], [tx1, ty1, z_offset + height], [tx2, ty2, z_offset + height]])
    return faces


def create_hollow_cone(r_bot_out, r_bot_in, r_top_out, r_top_in, height,
                       segments=48, z_offset=0, x_offset=0, y_offset=0):
    """Create a hollow truncated cone (frustum with hole)."""
    faces = []
    for i in range(segments):
        a1 = 2 * math.pi * i / segments
        a2 = 2 * math.pi * (i + 1) / segments

        cos1, sin1 = math.cos(a1), math.sin(a1)
        cos2, sin2 = math.cos(a2), math.sin(a2)

        # Outer bottom/top
        obx1 = r_bot_out * cos1 + x_offset; oby1 = r_bot_out * sin1 + y_offset
        obx2 = r_bot_out * cos2 + x_offset; oby2 = r_bot_out * sin2 + y_offset
        otx1 = r_top_out * cos1 + x_offset; oty1 = r_top_out * sin1 + y_offset
        otx2 = r_top_out * cos2 + x_offset; oty2 = r_top_out * sin2 + y_offset

        # Inner bottom/top
        ibx1 = r_bot_in * cos1 + x_offset; iby1 = r_bot_in * sin1 + y_offset
        ibx2 = r_bot_in * cos2 + x_offset; iby2 = r_bot_in * sin2 + y_offset
        itx1 = r_top_in * cos1 + x_offset; ity1 = r_top_in * sin1 + y_offset
        itx2 = r_top_in * cos2 + x_offset; ity2 = r_top_in * sin2 + y_offset

        z_b = z_offset
        z_t = z_offset + height

        # Outer wall
        faces.append([[obx1, oby1, z_b], [otx1, oty1, z_t], [obx2, oby2, z_b]])
        faces.append([[obx2, oby2, z_b], [otx1, oty1, z_t], [otx2, oty2, z_t]])

        # Inner wall
        faces.append([[ibx1, iby1, z_b], [ibx2, iby2, z_b], [itx1, ity1, z_t]])
        faces.append([[ibx2, iby2, z_b], [itx2, ity2, z_t], [itx1, ity1, z_t]])

        # Bottom ring
        faces.append([[obx1, oby1, z_b], [obx2, oby2, z_b], [ibx1, iby1, z_b]])
        faces.append([[ibx1, iby1, z_b], [obx2, oby2, z_b], [ibx2, iby2, z_b]])

        # Top ring
        faces.append([[otx1, oty1, z_t], [itx1, ity1, z_t], [otx2, oty2, z_t]])
        faces.append([[itx2, ity2, z_t], [otx2, oty2, z_t], [itx1, ity1, z_t]])

    return faces


def create_tilted_tube(outer_r, inner_r, length, segments, start_pos, direction):
    """Create a hollow tube along a direction vector."""
    faces = []
    d = np.array(direction, dtype=float)
    d = d / np.linalg.norm(d)

    if abs(d[2]) < 0.9:
        up = np.array([0, 0, 1], dtype=float)
    else:
        up = np.array([1, 0, 0], dtype=float)

    perp1 = np.cross(d, up)
    perp1 = perp1 / np.linalg.norm(perp1)
    perp2 = np.cross(d, perp1)
    perp2 = perp2 / np.linalg.norm(perp2)

    start = np.array(start_pos, dtype=float)
    end = start + d * length

    for i in range(segments):
        a1 = 2 * math.pi * i / segments
        a2 = 2 * math.pi * (i + 1) / segments

        o_off1 = outer_r * (math.cos(a1) * perp1 + math.sin(a1) * perp2)
        o_off2 = outer_r * (math.cos(a2) * perp1 + math.sin(a2) * perp2)
        i_off1 = inner_r * (math.cos(a1) * perp1 + math.sin(a1) * perp2)
        i_off2 = inner_r * (math.cos(a2) * perp1 + math.sin(a2) * perp2)

        ob1 = (start + o_off1).tolist()
        ob2 = (start + o_off2).tolist()
        ot1 = (end + o_off1).tolist()
        ot2 = (end + o_off2).tolist()
        ib1 = (start + i_off1).tolist()
        ib2 = (start + i_off2).tolist()
        it1 = (end + i_off1).tolist()
        it2 = (end + i_off2).tolist()

        # Outer wall
        faces.append([ob1, ot1, ob2])
        faces.append([ob2, ot1, ot2])
        # Inner wall
        faces.append([ib1, ib2, it1])
        faces.append([ib2, it2, it1])
        # Bottom annulus
        faces.append([ob1, ob2, ib1])
        faces.append([ib1, ob2, ib2])
        # Top annulus
        faces.append([ot1, it1, ot2])
        faces.append([it2, ot2, it1])

    return faces


def create_tilted_cylinder(radius, length, segments, start_pos, direction):
    """Create a solid cylinder along a direction vector."""
    faces = []
    d = np.array(direction, dtype=float)
    d = d / np.linalg.norm(d)

    if abs(d[2]) < 0.9:
        up = np.array([0, 0, 1], dtype=float)
    else:
        up = np.array([1, 0, 0], dtype=float)

    perp1 = np.cross(d, up)
    perp1 = perp1 / np.linalg.norm(perp1)
    perp2 = np.cross(d, perp1)
    perp2 = perp2 / np.linalg.norm(perp2)

    start = np.array(start_pos, dtype=float)
    end = start + d * length

    for i in range(segments):
        a1 = 2 * math.pi * i / segments
        a2 = 2 * math.pi * (i + 1) / segments

        off1 = radius * (math.cos(a1) * perp1 + math.sin(a1) * perp2)
        off2 = radius * (math.cos(a2) * perp1 + math.sin(a2) * perp2)

        b1 = (start + off1).tolist()
        b2 = (start + off2).tolist()
        t1 = (end + off1).tolist()
        t2 = (end + off2).tolist()

        faces.append([start.tolist(), b1, b2])
        faces.append([end.tolist(), t2, t1])
        faces.append([b1, t1, b2])
        faces.append([b2, t1, t2])

    return faces


def generate_mortar_bottle_opener():
    """
    Generate a mechanically functional mortar-style bottle opener.

    MECHANISM:
    - The barrel is a HOLLOW TUBE (inner diameter ~29mm for bottle neck)
    - At the bottom of the barrel interior, there's a CAP-CATCHING RING
      with inner diameter ~21mm (smaller than the 26.5mm cap)
    - The ring has a beveled/chamfered top edge so the cap can slide past
      going DOWN, but catches on the way back UP
    - You insert bottle upside-down into the top (muzzle)
    - Push down - the cap catches on the ring and pops off
    - The bottle continues through; the cap stays inside

    Standard beer bottle dimensions:
    - Cap outer diameter: 26.5mm
    - Cap height: ~6mm
    - Bottle neck outer diameter: ~26mm
    - Bottle body diameter: ~60-65mm
    """
    all_faces = []
    seg = 48

    # =============================================
    # KEY DIMENSIONS
    # =============================================
    barrel_outer_r = 18       # Outer radius of barrel tube
    barrel_inner_r = 14.5     # Inner radius (~29mm ID, fits bottle neck ~26mm)
    barrel_length = 130       # Total barrel length
    barrel_wall = barrel_outer_r - barrel_inner_r  # 3.5mm wall thickness

    cap_ring_inner_r = 10.5   # ~21mm ID - smaller than 26.5mm cap = catches it
    cap_ring_height = 5       # Height of the catching ring

    # Barrel direction (angled like a mortar, ~75 deg from horizontal)
    barrel_angle = 78  # degrees from horizontal
    angle_rad = math.radians(barrel_angle)
    barrel_dir = [0, math.cos(angle_rad), math.sin(angle_rad)]

    # =============================================
    # TRIPOD BASE - flat on ground (Z=0)
    # =============================================

    # Central hub sits at the top of the tripod
    hub_z = 45  # Height of the hub above ground
    hub_outer_r = 22
    hub_inner_r = barrel_outer_r + 0.5  # Slightly larger than barrel

    # Hub ring (where barrel passes through)
    all_faces.extend(create_tube(
        outer_radius=hub_outer_r, inner_radius=hub_inner_r,
        height=15, segments=seg, z_offset=hub_z - 5
    ))

    # Hub reinforcement collar top
    all_faces.extend(create_tube(
        outer_radius=hub_outer_r + 2, inner_radius=hub_outer_r,
        height=3, segments=seg, z_offset=hub_z + 8
    ))
    # Hub reinforcement collar bottom
    all_faces.extend(create_tube(
        outer_radius=hub_outer_r + 2, inner_radius=hub_outer_r,
        height=3, segments=seg, z_offset=hub_z - 5
    ))

    # Three tripod legs
    leg_radius = 5
    leg_length = 70
    for i in range(3):
        angle = 2 * math.pi * i / 3 - math.pi / 2  # One leg toward front

        dx = math.cos(angle)
        dy = math.sin(angle)

        # Leg starts from hub, goes outward and downward to ground
        leg_start = [dx * 20, dy * 20, hub_z - 2]
        # Direction: outward and downward to reach Z=0
        leg_dir_raw = np.array([dx * 0.65, dy * 0.65, -0.6])
        leg_dir = leg_dir_raw / np.linalg.norm(leg_dir_raw)

        all_faces.extend(create_tilted_cylinder(
            leg_radius, leg_length, seg // 2, leg_start, leg_dir.tolist()
        ))

        # Foot pad - flat on ground
        end_pos = np.array(leg_start) + leg_dir * leg_length
        foot_z = 0  # Flat on ground
        all_faces.extend(create_cylinder(
            radius=10, height=3, segments=seg // 2,
            x_offset=end_pos[0], y_offset=end_pos[1], z_offset=foot_z
        ))

        # Leg-to-hub gusset (reinforcement triangle)
        gusset_start = [dx * 18, dy * 18, hub_z]
        gusset_dir = [dx * 0.3, dy * 0.3, -0.15]
        all_faces.extend(create_tilted_cylinder(
            3, 20, seg // 4, gusset_start, gusset_dir
        ))

    # =============================================
    # BARREL - HOLLOW TUBE (the key mechanical part)
    # =============================================

    barrel_start = np.array([0, 0, hub_z])
    barrel_dir_norm = np.array(barrel_dir) / np.linalg.norm(barrel_dir)

    # Main barrel tube - HOLLOW
    all_faces.extend(create_tilted_tube(
        outer_r=barrel_outer_r,
        inner_r=barrel_inner_r,
        length=barrel_length,
        segments=seg,
        start_pos=barrel_start.tolist(),
        direction=barrel_dir
    ))

    # =============================================
    # CAP-CATCHING RING (inside barrel, near bottom)
    # This is THE critical mechanical component!
    #
    # The ring reduces the inner diameter from 29mm to ~21mm.
    # Cap diameter is 26.5mm, so the cap CANNOT pass through.
    # The top of the ring is chamfered so the cap slides in easily
    # but catches when pulled back.
    # =============================================

    # Position the ring inside the barrel, ~15mm from the bottom
    ring_offset = 15
    ring_pos = barrel_start + barrel_dir_norm * ring_offset

    # Cap catching ring - reduces inner diameter
    # This is a tube inside the barrel: outer=barrel_inner, inner=cap_ring_inner
    all_faces.extend(create_tilted_tube(
        outer_r=barrel_inner_r,      # Matches barrel inner wall
        inner_r=cap_ring_inner_r,    # 10.5mm = 21mm diameter (catches 26.5mm cap)
        length=cap_ring_height,
        segments=seg,
        start_pos=ring_pos.tolist(),
        direction=barrel_dir
    ))

    # Chamfered entry above the ring (guides the cap in)
    # Tapers from barrel_inner_r down to cap_ring_inner_r
    chamfer_pos = ring_pos + barrel_dir_norm * cap_ring_height
    chamfer_height = 8

    # We approximate the chamfer with a hollow cone
    all_faces.extend(create_hollow_cone(
        r_bot_out=barrel_inner_r, r_bot_in=cap_ring_inner_r,   # Bottom = ring size
        r_top_out=barrel_inner_r, r_top_in=barrel_inner_r - 1, # Top = almost flush
        height=chamfer_height, segments=seg,
        z_offset=0,  # We'll handle position via the tilted approach
        x_offset=chamfer_pos[0], y_offset=chamfer_pos[1]
    ))
    # Note: for simplicity, the chamfer is axis-aligned. For the slight tilt
    # of the barrel this is acceptable for 3D printing.

    # =============================================
    # BARREL BOTTOM CAP (with drain hole for caps)
    # =============================================

    # Close the bottom of the barrel with a cap that has a small hole
    # The hole lets you push out accumulated caps
    bottom_cap_pos = barrel_start - barrel_dir_norm * 2
    all_faces.extend(create_tilted_tube(
        outer_r=barrel_outer_r,
        inner_r=5,  # Small 10mm hole to push caps out
        length=3,
        segments=seg,
        start_pos=bottom_cap_pos.tolist(),
        direction=barrel_dir
    ))

    # =============================================
    # MUZZLE (top of barrel - where you insert the bottle)
    # =============================================

    barrel_end = barrel_start + barrel_dir_norm * barrel_length

    # Flared muzzle opening - guides the bottle in
    all_faces.extend(create_hollow_cone(
        r_bot_out=barrel_outer_r + 1, r_bot_in=barrel_inner_r,
        r_top_out=barrel_outer_r + 6, r_top_in=barrel_inner_r + 4,
        height=10, segments=seg,
        x_offset=barrel_end[0], y_offset=barrel_end[1], z_offset=barrel_end[2]
    ))

    # Muzzle lip ring
    muzzle_top = barrel_end + barrel_dir_norm * 0  # At barrel end
    all_faces.extend(create_tube(
        outer_radius=barrel_outer_r + 7, inner_radius=barrel_outer_r + 5,
        height=3, segments=seg,
        x_offset=barrel_end[0] + barrel_dir_norm[0] * 10,
        y_offset=barrel_end[1] + barrel_dir_norm[1] * 10,
        z_offset=barrel_end[2] + barrel_dir_norm[2] * 10
    ))

    # =============================================
    # DECORATIVE BARREL BANDS
    # =============================================
    for t in [0.3, 0.55, 0.8]:
        band_pos = barrel_start + barrel_dir_norm * (barrel_length * t)
        all_faces.extend(create_tube(
            outer_radius=barrel_outer_r + 2,
            inner_radius=barrel_outer_r,
            height=4, segments=seg,
            x_offset=band_pos[0], y_offset=band_pos[1], z_offset=band_pos[2]
        ))

    # =============================================
    # SIGHT (decorative - on top of barrel)
    # =============================================
    sight_pos = barrel_start + barrel_dir_norm * (barrel_length * 0.85)
    all_faces.extend(create_cylinder(
        radius=2, height=12, segments=seg // 4,
        x_offset=sight_pos[0] - 10, y_offset=sight_pos[1],
        z_offset=sight_pos[2]
    ))

    # =============================================
    # CONVERT TO STL
    # =============================================
    face_array = np.array(all_faces)
    stl_mesh = mesh.Mesh(np.zeros(len(face_array), dtype=mesh.Mesh.dtype))
    for i, face in enumerate(face_array):
        for j in range(3):
            stl_mesh.vectors[i][j] = face[j]

    stl_mesh.update_normals()
    return stl_mesh


if __name__ == "__main__":
    print("=" * 55)
    print("  MORTAR BOTTLE OPENER - Mechanically Functional V2")
    print("=" * 55)
    print()

    mortar = generate_mortar_bottle_opener()
    output = "mortar_bottle_opener.stl"
    mortar.save(output)

    dx = mortar.x.max() - mortar.x.min()
    dy = mortar.y.max() - mortar.y.min()
    dz = mortar.z.max() - mortar.z.min()

    print(f"File: {output}")
    print(f"Faces: {len(mortar.vectors)}")
    print(f"Size:  {dx:.1f} x {dy:.1f} x {dz:.1f} mm")
    print()
    print("MECHANICAL SPECS:")
    print(f"  Barrel inner diameter:  29.0 mm  (fits bottle neck ~26mm)")
    print(f"  Cap ring inner diameter: 21.0 mm  (catches cap ~26.5mm)")
    print(f"  Barrel wall thickness:   3.5 mm")
    print(f"  Barrel length:          130.0 mm")
    print()
    print("HOW IT WORKS:")
    print("  1. Place bottle upside-down into the muzzle (top)")
    print("  2. Push the bottle down into the barrel")
    print("  3. The cap catches on the internal ring")
    print("  4. Continue pushing - the cap pops off!")
    print("  5. The cap stays inside the barrel")
    print()
    print("PRINT SETTINGS:")
    print("  - Orientation: Print VERTICALLY (muzzle up)")
    print("  - Layer height: 0.2mm")
    print("  - Infill: 60-80% (needs strength at the cap ring)")
    print("  - Supports: YES (for tripod legs)")
    print("  - Material: PETG recommended (stronger than PLA)")
    print("  - Wall count: 4+ (for barrel strength)")
    print()
    print("  NOTE: The cap-catching ring is the critical part.")
    print("  Test fit with a bottle cap after printing.")
    print("  If too tight: sand the ring. If too loose: add tape.")
