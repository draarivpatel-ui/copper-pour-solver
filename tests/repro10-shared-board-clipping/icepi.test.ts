import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import type { AnyCircuitElement } from "circuit-json"
import type { InputProblem } from "lib/types"
import { renderBoardClipRepro } from "./render-board-clip-repro"

test("iCEPi clips 76 pour regions to its physical board", () => {
  const input: InputProblem = JSON.parse(
    gunzipSync(
      readFileSync(`${import.meta.dir}/icepi-pour-input.json.gz`),
    ).toString(),
  )
  const circuitJson: AnyCircuitElement[] = JSON.parse(
    gunzipSync(
      readFileSync(`${import.meta.dir}/icepi.circuit.json.gz`),
    ).toString(),
  )
  const { svg, output, boardClipBuilds } = renderBoardClipRepro({
    input,
    circuitJson,
  })
  expect(input.pads).toHaveLength(1717)
  expect(output.brep_shapes_by_region).toHaveLength(76)
  expect(output.brep_shapes).toHaveLength(194)
  expect(boardClipBuilds).toBeGreaterThan(0)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
}, 60_000)
