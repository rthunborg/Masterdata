import { describe, it, expect } from "vitest";
import enMessages from "../../../messages/en.json";
import svMessages from "../../../messages/sv.json";

describe("Third-Party References", () => {
  const bannedCompanies = ["Sodexo", "Bluegarden", "Silkeborg Forsyning"];
  
  // Note: ÖMC is excluded because it appears in category dropdown options
  // which are legitimate database categories, not marketing text
  
  it("should not contain third-party company names in English translation files", () => {
    const jsonString = JSON.stringify(enMessages);
    
    const foundReferences = bannedCompanies.filter(company => 
      jsonString.includes(company)
    );
    
    expect(foundReferences, `Found third-party references in en.json: ${foundReferences.join(", ")}`).toEqual([]);
  });

  it("should not contain third-party company names in Swedish translation files", () => {
    const jsonString = JSON.stringify(svMessages);
    
    const foundReferences = bannedCompanies.filter(company => 
      jsonString.includes(company)
    );
    
    expect(foundReferences, `Found third-party references in sv.json: ${foundReferences.join(", ")}`).toEqual([]);
  });
});
