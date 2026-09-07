import { afterEach, describe, expect, it, vi } from "vitest";

const {
  createLocationMock,
  createWorkerMock,
  updateWorkerMock,
  revalidateMock,
  redirectMock,
} = vi.hoisted(() => ({
  createLocationMock: vi.fn(),
  createWorkerMock: vi.fn(),
  updateWorkerMock: vi.fn(),
  revalidateMock: vi.fn(),
  redirectMock: vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("./graphql-client", () => ({
  createLocation: createLocationMock,
  createWorker: createWorkerMock,
  updateLocation: vi.fn(),
  updateWorker: updateWorkerMock,
  deactivateWorker: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { createLocationAction, createWorkerAction, updateWorkerAction } from "./crud-actions";

afterEach(() => vi.clearAllMocks());

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

describe("crud-actions", () => {
  it("createLocationAction は入力をマップして作成し /locations へ", async () => {
    createLocationMock.mockResolvedValue({ id: "L1" });
    await expect(
      createLocationAction(
        {},
        fd({ name: "渋谷", timeZone: "Asia/Tokyo", businessDayCutoffHour: "5", country: "JP" }),
      ),
    ).rejects.toThrow("REDIRECT:/locations");
    expect(createLocationMock).toHaveBeenCalledWith({
      name: "渋谷",
      timeZone: "Asia/Tokyo",
      businessDayCutoffHour: 5,
      country: "JP",
    });
  });

  it("createLocationAction は失敗時に BAD_USER_INPUT のメッセージを返す", async () => {
    createLocationMock.mockRejectedValue({ response: { errors: [{ message: "name: 必須です" }] } });
    const r = await createLocationAction({}, fd({ name: "", timeZone: "x" }));
    expect(r).toEqual({ error: "name: 必須です" });
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it("createWorkerAction は locationId を束ねて作成し拠点別一覧へ", async () => {
    createWorkerMock.mockResolvedValue({ id: "W1" });
    await expect(
      createWorkerAction("L1", {}, fd({ name: "鈴木", displayName: "鈴木", nameKana: "すずき" })),
    ).rejects.toThrow("REDIRECT:/workers?location=L1");
    expect(createWorkerMock).toHaveBeenCalledWith({
      locationId: "L1",
      name: "鈴木",
      displayName: "鈴木",
      nameKana: "すずき",
    });
  });

  it("updateWorkerAction は active チェックを反映する", async () => {
    updateWorkerMock.mockResolvedValue({ id: "W1" });
    // active チェックボックス無し → 退職（active=false）
    await expect(
      updateWorkerAction("W1", "L1", {}, fd({ displayName: "山田T" })),
    ).rejects.toThrow("REDIRECT:/workers?location=L1");
    expect(updateWorkerMock).toHaveBeenCalledWith("W1", {
      name: undefined,
      displayName: "山田T",
      nameKana: undefined,
      active: false,
    });
  });
});
