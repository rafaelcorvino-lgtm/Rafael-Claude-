"""
Generate STL file for a Military Mortar-Style Bottle Opener with Tripod Base.
Based on the novelty bottle opener that looks like a small mortar on a tripod.

Dimensions are in millimeters, designed for 3D printing (FDM/resin).
"""

import numpy as np
from stl import mesh
import math


def create_cylinder(radius, height, segments=32, z_offset=0, x_offset=0, y_offset=0):
    """Create a cylinder as a list of triangular faces."""
    faces = []
    for i in range(segments):
        angle1 = 2 * math.pi * i / segments
        angle2 = 2 * math.pi * (i + 1) / segments

        x1 = radius * math.cos(angle1) + x_offset
        y1 = radius * math.sin(angle1) + y_offset
        x2 = radius * math.cos(angle2) + x_offset
        y2 = radius * math.sin(angle2) + y_offset

        # Bottom face
        faces.append([
            [x_offset, y_offset, z_offset],
            [x1, y1, z_offset],
            [x2, y2, z_offset]
        ])
        # Top face
        faces.append([
            [x_offset, y_offset, z_offset + height],
            [x2, y2, z_offset + height],
            [x1, y1, z_offset + height]
        ])
        # Side faces
        faces.append([
            [x1, y1, z_offset],
            [x1, y1, z_offset + height],
            [x2, y2, z_offset]
        ])
        faces.append([
            [x2, y2, z_offset],
            [x1, y1, z_offset + height],
            [x2, y2, z_offset + height]
        ])
    return faces


def create_cone(radius_bottom, radius_top, height, segments=32, z_offset=0, x_offset=0, y_offset=0):
    """Create a truncated cone (frustum)."""
    faces = []
    for i in range(segments):
        angle1 = 2 * math.pi * i / segments
        angle2 = 2 * math.pi * (i + 1) / segments

        bx1 = radius_bottom * math.cos(angle1) + x_offset
        by1 = radius_bottom * math.sin(angle1) + y_offset
        bx2 = radius_bottom * math.cos(angle2) + x_offset
        by2 = radius_bottom * math.sin(angle2) + y_offset

        tx1 = radius_top * math.cos(angle1) + x_offset
        ty1 = radius_top * math.sin(angle1) + y_offset
        tx2 = radius_top * math.cos(angle2) + x_offset
        ty2 = radius_top * math.sin(angle2) + y_offset

        # Bottom cap
        if radius_bottom > 0.01:
            faces.append([
                [x_offset, y_offset, z_offset],
                [bx1, by1, z_offset],
                [bx2, by2, z_offset]
            ])
        # Top cap
        if radius_top > 0.01:
            faces.append([
                [x_offset, y_offset, z_offset + height],
                [tx2, ty2, z_offset + height],
                [tx1, ty1, z_offset + height]
            ])
        # Side faces
        faces.append([
            [bx1, by1, z_offset],
            [tx1, ty1, z_offset + height],
            [bx2, by2, z_offset]
        ])
        faces.append([
            [bx2, by2, z_offset],
            [tx1, ty1, z_offset + height],
            [tx2, ty2, z_offset + height]
        ])
    return faces


def create_tilted_cylinder(radius, length, segments, start_pos, direction):
    """Create a cylinder along a given direction vector."""
    faces = []
    d = np.array(direction, dtype=float)
    d = d / np.linalg.norm(d)

    # Find two perpendicular vectors
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
        angle1 = 2 * math.pi * i / segments
        angle2 = 2 * math.pi * (i + 1) / segments

        offset1 = radius * (math.cos(angle1) * perp1 + math.sin(angle1) * perp2)
        offset2 = radius * (math.cos(angle2) * perp1 + math.sin(angle2) * perp2)

        b1 = start + offset1
        b2 = start + offset2
        t1 = end + offset1
        t2 = end + offset2

        # Bottom cap
        faces.append([start.tolist(), b1.tolist(), b2.tolist()])
        # Top cap
        faces.append([end.tolist(), t2.tolist(), t1.tolist()])
        # Side
        faces.append([b1.tolist(), t1.tolist(), b2.tolist()])
        faces.append([b2.tolist(), t1.tolist(), t2.tolist()])

    return faces


def create_box(width, depth, height, x_offset=0, y_offset=0, z_offset=0):
    """Create a rectangular box."""
    w, d, h = width / 2, depth / 2, height
    x, y, z = x_offset, y_offset, z_offset

    vertices = [
        [x - w, y - d, z], [x + w, y - d, z], [x + w, y + d, z], [x - w, y + d, z],
        [x - w, y - d, z + h], [x + w, y - d, z + h], [x + w, y + d, z + h], [x - w, y + d, z + h]
    ]
    v = vertices
    faces = [
        # Bottom
        [v[0], v[2], v[1]], [v[0], v[3], v[2]],
        # Top
        [v[4], v[5], v[6]], [v[4], v[6], v[7]],
        # Front
        [v[0], v[1], v[5]], [v[0], v[5], v[4]],
        # Back
        [v[2], v[3], v[7]], [v[2], v[7], v[6]],
        # Left
        [v[0], v[4], v[7]], [v[0], v[7], v[3]],
        # Right
        [v[1], v[2], v[6]], [v[1], v[6], v[5]],
    ]
    return faces


def generate_mortar_bottle_opener():
    """Generate the full mortar-style bottle opener STL."""
    all_faces = []
    seg = 48  # Higher segment count for smoother curves

    # ===== BASE PLATE =====
    # Circular base plate where the tripod connects
    all_faces.extend(create_cylinder(radius=25, height=4, segments=seg, z_offset=0))

    # ===== TRIPOD LEGS =====
    # Three legs spreading out from the base, angled downward and outward
    leg_radius = 4
    leg_length = 65
    for i in range(3):
        angle = 2 * math.pi * i / 3 + math.pi / 6
        dx = math.cos(angle)
        dy = math.sin(angle)

        # Leg goes outward and downward from the base
        start = [dx * 18, dy * 18, 3]
        direction = [dx * 0.7, dy * 0.7, -0.55]

        all_faces.extend(create_tilted_cylinder(
            leg_radius, leg_length, seg // 2, start, direction
        ))

        # Foot pad at the end of each leg
        end_pos = np.array(start) + np.array(direction) / np.linalg.norm(direction) * leg_length
        all_faces.extend(create_cylinder(
            radius=7, height=3, segments=seg // 2,
            x_offset=end_pos[0], y_offset=end_pos[1], z_offset=end_pos[2] - 1.5
        ))

    # ===== CENTRAL HUB / PIVOT =====
    # The center hub where the mortar barrel connects
    all_faces.extend(create_cylinder(radius=12, height=8, segments=seg, z_offset=4))

    # Pivot collar
    all_faces.extend(create_cone(
        radius_bottom=14, radius_top=10,
        height=6, segments=seg, z_offset=12
    ))

    # ===== MORTAR BARREL (Main lever/opener arm) =====
    # The barrel is the main body - angled upward from the pivot
    barrel_radius = 9
    barrel_length = 120

    # Barrel tilted at ~60 degrees from horizontal
    barrel_start = [0, 0, 18]
    barrel_dir = [0, 0.15, 1.0]  # Mostly vertical, slightly tilted

    all_faces.extend(create_tilted_cylinder(
        barrel_radius, barrel_length, seg, barrel_start, barrel_dir
    ))

    # Barrel muzzle flare (top of the barrel)
    barrel_end = np.array(barrel_start) + np.array(barrel_dir) / np.linalg.norm(barrel_dir) * barrel_length
    all_faces.extend(create_cone(
        radius_bottom=9, radius_top=12,
        height=8, segments=seg,
        x_offset=barrel_end[0], y_offset=barrel_end[1], z_offset=barrel_end[2]
    ))

    # Muzzle cap ring
    muzzle_top_z = barrel_end[2] + 8
    all_faces.extend(create_cylinder(
        radius=12, height=3, segments=seg,
        x_offset=barrel_end[0], y_offset=barrel_end[1], z_offset=muzzle_top_z
    ))

    # ===== BARREL BANDS (decorative rings) =====
    for t in [0.25, 0.5, 0.75]:
        band_pos = np.array(barrel_start) + np.array(barrel_dir) / np.linalg.norm(barrel_dir) * (barrel_length * t)
        all_faces.extend(create_cylinder(
            radius=10.5, height=3, segments=seg,
            x_offset=band_pos[0], y_offset=band_pos[1], z_offset=band_pos[2]
        ))

    # ===== BOTTLE OPENER MECHANISM =====
    # The opener hook at the back/bottom of the barrel
    # Small lever arm extending from the barrel base
    lever_start = [0, -8, 14]
    lever_dir = [0, -1, -0.3]
    all_faces.extend(create_tilted_cylinder(
        4, 35, seg // 2, lever_start, lever_dir
    ))

    # Opener hook (the part that catches the bottle cap)
    lever_end = np.array(lever_start) + np.array(lever_dir) / np.linalg.norm(lever_dir) * 35
    # Hook plate
    all_faces.extend(create_box(
        width=20, depth=8, height=3,
        x_offset=lever_end[0], y_offset=lever_end[1], z_offset=lever_end[2]
    ))
    # Hook lip (the actual opener edge)
    all_faces.extend(create_box(
        width=20, depth=3, height=6,
        x_offset=lever_end[0], y_offset=lever_end[1] - 2.5, z_offset=lever_end[2] - 3
    ))

    # ===== HANDLE / GRIP =====
    # Small grip on the barrel for pushing down
    handle_pos = np.array(barrel_start) + np.array(barrel_dir) / np.linalg.norm(barrel_dir) * (barrel_length * 0.6)
    all_faces.extend(create_box(
        width=6, depth=18, height=6,
        x_offset=handle_pos[0], y_offset=handle_pos[1] - 12, z_offset=handle_pos[2]
    ))

    # ===== SIGHT (decorative, on top of barrel) =====
    sight_pos = np.array(barrel_start) + np.array(barrel_dir) / np.linalg.norm(barrel_dir) * (barrel_length * 0.85)
    all_faces.extend(create_box(
        width=2, depth=2, height=15,
        x_offset=sight_pos[0], y_offset=sight_pos[1] + 10, z_offset=sight_pos[2]
    ))

    # ===== CONVERT TO STL MESH =====
    face_array = np.array(all_faces)
    total_faces = len(face_array)

    stl_mesh = mesh.Mesh(np.zeros(total_faces, dtype=mesh.Mesh.dtype))
    for i, face in enumerate(face_array):
        for j in range(3):
            stl_mesh.vectors[i][j] = face[j]

    # Center the model on XY plane
    stl_mesh.update_normals()

    return stl_mesh


if __name__ == "__main__":
    print("Generating Mortar-Style Bottle Opener STL...")
    mortar_mesh = generate_mortar_bottle_opener()

    output_file = "mortar_bottle_opener.stl"
    mortar_mesh.save(output_file)

    # Print dimensions
    minx = mortar_mesh.x.min()
    maxx = mortar_mesh.x.max()
    miny = mortar_mesh.y.min()
    maxy = mortar_mesh.y.max()
    minz = mortar_mesh.z.min()
    maxz = mortar_mesh.z.max()

    print(f"File saved: {output_file}")
    print(f"Dimensions (mm):")
    print(f"  Width  (X): {maxx - minx:.1f} mm")
    print(f"  Depth  (Y): {maxy - miny:.1f} mm")
    print(f"  Height (Z): {maxz - minz:.1f} mm")
    print(f"  Total faces: {len(mortar_mesh.vectors)}")
    print()
    print("Printing tips:")
    print("  - Layer height: 0.2mm for FDM")
    print("  - Infill: 40-60% for strength")
    print("  - Supports: YES (needed for tripod legs and barrel)")
    print("  - Material: PLA or PETG recommended")
    print("  - Scale: Model is 1:1 at ~150mm tall")
