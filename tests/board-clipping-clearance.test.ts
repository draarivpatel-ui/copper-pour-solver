import { expect, test } from "bun:test"
import { CopperPourPipelineSolver } from "lib/index"
import type { InputPourRegion, InputProblem } from "lib/types"

test("board clipping respects each outline and clearance and refreshed input", () => {
  const boardOutline = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]
  const region: InputPourRegion = {
    shape: "rect",
    layer: "top",
    bounds: { minX: -5, minY: -5, maxX: 15, maxY: 15 },
    boardOutline,
    connectivityKey: "net:GND",
    padMargin: 0.2,
    traceMargin: 0.2,
    board_edge_margin: 0.5,
  }
  const input: InputProblem = {
    pads: [],
    regionsForPour: [
      region,
      {
        ...region,
        layer: "bottom",
        boardOutline: structuredClone(boardOutline),
      },
      { ...region, layer: "inner1", board_edge_margin: 1 },
      {
        ...region,
        layer: "inner2",
        boardOutline: undefined,
        boardEdgeOutline: boardOutline.map(({ x, y }) => ({ x: x * 0.8, y })),
      },
    ],
  }
  const solver = new CopperPourPipelineSolver(input)
  const output = solver.getOutput()
  for (const [index, expected] of [
    [0.5, 9.5, 0.5, 9.5],
    [0.5, 9.5, 0.5, 9.5],
    [1, 9, 1, 9],
    [0.5, 7.5, 0.5, 9.5],
  ].entries()) {
    const shapes = output.brep_shapes_by_region[index]!
    expect(shapes).toHaveLength(1)
    const vertices = shapes[0]!.outer_ring.vertices
    expect([
      Math.min(...vertices.map((point) => point.x)),
      Math.max(...vertices.map((point) => point.x)),
      Math.min(...vertices.map((point) => point.y)),
      Math.max(...vertices.map((point) => point.y)),
    ]).toEqual(expected)
  }

  region.board_edge_margin = 2
  region.boardOutline = boardOutline.map(({ x, y }) => ({ x: x + 1, y }))
  const refreshed = solver.getOutput().brep_shapes_by_region[0]!
  expect(refreshed).toHaveLength(1)
  expect(refreshed[0]!.outer_ring.vertices).toEqual(
    expect.arrayContaining([
      { x: 3, y: 2 },
      { x: 9, y: 2 },
      { x: 9, y: 8 },
      { x: 3, y: 8 },
    ]),
  )
})
