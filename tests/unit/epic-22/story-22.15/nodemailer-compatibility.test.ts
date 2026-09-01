import nodemailer from "nodemailer";
import { describe, expect, it } from "vitest";

describe("Story 22.15 Nodemailer 9 compatibility", () => {
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
