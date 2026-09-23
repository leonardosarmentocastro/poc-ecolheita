"use client";

import { useState, type FormEvent } from "react";
import { Button, TextInput } from "@mantine/core";

export interface SearchFormProps {
  onSearch: (query: string) => void;
}

/** Presentational: one search box; blank queries never leave the form. */
export function SearchForm({ onSearch }: SearchFormProps) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (query === "") return;
    onSearch(query);
  };

  return (
    <form role="search" onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <TextInput
        type="search"
        label="Nome do produto"
        placeholder="banana"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        className="flex-1"
        size="md"
      />
      <Button type="submit" size="md" h={44}>
        Buscar
      </Button>
    </form>
  );
}
