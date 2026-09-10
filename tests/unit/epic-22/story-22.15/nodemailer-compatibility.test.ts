import nodemailer from "nodemailer";
import fs from "node:fs";
import http from "node:http";
import { describe, expect, it, vi } from "vitest";

describe("Story 22.15 Nodemailer 9 compatibility", () => {
  it.each([
    ["blocked-mail-fixture.txt", "EFILEACCESS"],
    ["http://127.0.0.1:1/blocked-mail-fixture", "EURLACCESS"],
  ])("preserves the transport access policy for legacy plugin resolution of %s", async (path, code) => {
    const fileRead = vi.spyOn(fs, "createReadStream").mockImplementation(() => {
      throw new Error("The compatibility test must not read a file");
    });
    const request = vi.spyOn(http, "request").mockImplementation(() => {
      throw new Error("The compatibility test must not make a network request");
    });
    try {
      const transport = nodemailer.createTransport({
        jsonTransport: true, disableFileAccess: true, disableUrlAccess: true,
      });
      transport.use("compile", (mail, callback) => {
        // The three-argument plugin signature must inherit the message policy.
        mail.resolveContent({ attachment: { path } }, "attachment", (error) => {
          callback(error ?? new Error("Blocked content was unexpectedly resolved"));
        });
      });
      await expect(transport.sendMail({
        from: "noreply@example.test", to: "owner@example.test", text: "Ingen extern leverans",
      })).rejects.toMatchObject({ code });
      expect(fileRead).not.toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
    } finally {
      fileRead.mockRestore();
      request.mockRestore();
    }
  });

  it("builds and sends the application mail shape through a non-network transport", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const result = await transport.sendMail({
      from: "HR Masterdata <noreply@example.test>",
      to: ["owner@example.test"],
      subject: "ÖMC masterdata-påminnelse",
      text: "Testmeddelande utan extern leverans",
      html: "<p>Testmeddelande utan extern leverans</p>",
    });
    const message = JSON.parse(result.message.toString()) as {
      subject: string;
      to: Array<{ address: string }>;
    };

    expect(message.subject).toBe("ÖMC masterdata-påminnelse");
    expect(message.to).toEqual([
      expect.objectContaining({ address: "owner@example.test" }),
    ]);
  });
});
