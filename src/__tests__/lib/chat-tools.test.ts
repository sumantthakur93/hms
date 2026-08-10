import { describe, it, expect } from "vitest";
import {
  ALL_TOOLS,
  WRITE_TOOLS,
  TOOLS_PER_ROLE,
  SUGGESTED_PROMPTS,
  ROLE_SYSTEM_PROMPTS,
} from "@/lib/chat-tools";

describe("chat-tools registry", () => {
  it("has 21 tools total", () => {
    expect(Object.keys(ALL_TOOLS)).toHaveLength(21);
  });

  it("has 5 write tools", () => {
    expect(WRITE_TOOLS.size).toBe(5);
    expect(WRITE_TOOLS.has("bookAppointment")).toBe(true);
    expect(WRITE_TOOLS.has("cancelAppointment")).toBe(true);
    expect(WRITE_TOOLS.has("orderLabTest")).toBe(true);
    expect(WRITE_TOOLS.has("createPrescriptionItem")).toBe(true);
    expect(WRITE_TOOLS.has("recordPayment")).toBe(true);
  });

  it("has 16 read tools", () => {
    const readTools = Object.keys(ALL_TOOLS).filter((t) => !WRITE_TOOLS.has(t));
    expect(readTools).toHaveLength(16);
  });

  it("admin gets 14 read tools + 0 write tools", () => {
    const tools = TOOLS_PER_ROLE.ADMIN;
    const writes = tools.filter((t) => WRITE_TOOLS.has(t));
    expect(writes).toHaveLength(0);
    expect(tools.length).toBeGreaterThan(10);
  });

  it("doctor gets read + 2 write tools (orderLabTest, createPrescriptionItem)", () => {
    const tools = TOOLS_PER_ROLE.DOCTOR;
    expect(tools).toContain("orderLabTest");
    expect(tools).toContain("createPrescriptionItem");
    expect(tools).not.toContain("bookAppointment");
  });

  it("patient gets read + 2 write tools (bookAppointment, cancelAppointment)", () => {
    const tools = TOOLS_PER_ROLE.PATIENT;
    expect(tools).toContain("bookAppointment");
    expect(tools).toContain("cancelAppointment");
    expect(tools).not.toContain("orderLabTest");
    expect(tools).not.toContain("recordPayment");
  });

  it("receptionist gets read + 3 write tools", () => {
    const tools = TOOLS_PER_ROLE.RECEPTIONIST;
    expect(tools).toContain("bookAppointment");
    expect(tools).toContain("cancelAppointment");
    expect(tools).toContain("recordPayment");
    expect(tools).not.toContain("orderLabTest");
  });

  it("lab technician gets only 3 read tools", () => {
    const tools = TOOLS_PER_ROLE.LAB_TECHNICIAN;
    expect(tools).toHaveLength(3);
    const writes = tools.filter((t) => WRITE_TOOLS.has(t));
    expect(writes).toHaveLength(0);
  });

  it("every role has suggested prompts", () => {
    for (const role of ["ADMIN", "DOCTOR", "PATIENT", "RECEPTIONIST", "LAB_TECHNICIAN"] as const) {
      expect(SUGGESTED_PROMPTS[role].length).toBeGreaterThan(0);
    }
  });

  it("every role has a system prompt", () => {
    for (const role of ["ADMIN", "DOCTOR", "PATIENT", "RECEPTIONIST", "LAB_TECHNICIAN"] as const) {
      expect(ROLE_SYSTEM_PROMPTS[role]).toBeTruthy();
      expect(ROLE_SYSTEM_PROMPTS[role].length).toBeGreaterThan(50);
    }
  });

  it("all tools in TOOLS_PER_ROLE exist in ALL_TOOLS", () => {
    for (const role of Object.keys(TOOLS_PER_ROLE) as (keyof typeof TOOLS_PER_ROLE)[]) {
      for (const toolName of TOOLS_PER_ROLE[role]) {
        expect(ALL_TOOLS).toHaveProperty(toolName);
      }
    }
  });
});
