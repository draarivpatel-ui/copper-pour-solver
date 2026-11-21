import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToInputProblem } from "lib/index"
import circuitJson from "../assets/polygon-board.json"
import { renderBoardClipRepro } from "./render-board-clip-repro"

test("two pours clip to the same polygon board", () => {
  const input = convertCircuitJsonToInputProblem(
    circuitJson as AnyCircuitElement[],
    (["top", "bottom"] as const).map((layer) => ({
      layer,
      source_net_id: "source_net_0",
      pad_margin: 0.2,
      trace_margin: 0.2,
      board_edge_margin: 0.3,
    })),
  )
  const { svg, output, boardClipBuilds } = renderBoardClipRepro({
    input,
    circuitJson: circuitJson as AnyCircuitElement[],
  })
  expect(output.brep_shapes_by_region).toHaveLength(2)
  expect(
    output.brep_shapes_by_region.every((shapes) => shapes.length > 0),
  ).toBe(true)
  expect(boardClipBuilds).toBeGreaterThan(0)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
