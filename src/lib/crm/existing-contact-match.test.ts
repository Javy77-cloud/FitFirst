import { describe, expect, it } from "vitest";
import {
  findExistingContactMatch,
  identityFromLayoutFields,
} from "./existing-contact-match";

const book = [
  {
    id: "c1",
    firstName: "Elena",
    lastName: "Ruiz",
    email: "elena@example.com",
    phone: "(321) 555-0188",
  },
  {
    id: "c2",
    firstName: "John",
    middleName: "A",
    lastName: "Smith",
    email: null,
    phone: null,
  },
];

describe("findExistingContactMatch", () => {
  it("matches on email alone", () => {
    const hit = findExistingContactMatch(book, {
      firstName: "Other",
      lastName: "Person",
      email: "elena@example.com",
    });
    expect(hit?.contact.id).toBe("c1");
    expect(hit?.reason).toBe("email");
  });

  it("matches on phone alone", () => {
    const hit = findExistingContactMatch(book, {
      firstName: "Other",
      lastName: "Person",
      phone: "3215550188",
    });
    expect(hit?.contact.id).toBe("c1");
    expect(hit?.reason).toBe("phone");
  });

  it("matches on first + last name", () => {
    const hit = findExistingContactMatch(book, {
      firstName: "Elena",
      lastName: "Ruiz",
    });
    expect(hit?.contact.id).toBe("c1");
    expect(hit?.reason).toBe("name");
  });

  it("rejects name when middle disagrees", () => {
    const hit = findExistingContactMatch(book, {
      firstName: "John",
      middleName: "B",
      lastName: "Smith",
    });
    expect(hit).toBeNull();
  });

  it("reads layout field keys", () => {
    const map: Record<string, string> = {
      field_first_name: "Elena",
      field_last_name: "Ruiz",
      field_email: "elena@example.com",
    };
    const id = identityFromLayoutFields((key) => map[`field_${key}`] ?? map[key] ?? "");
    expect(id.firstName).toBe("Elena");
    expect(findExistingContactMatch(book, id)?.reason).toBe("email");
  });
});
