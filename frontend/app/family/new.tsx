import React from 'react';
import { useLocalSearchParams } from 'expo-router';
// Reuse the [id] component as new uses id="new"
import FamiliarForm from './[id]';

export default function NewFamiliarRoute() {
  // The form file uses useLocalSearchParams<{id}>; for /family/new no id is set,
  // so we render with explicit id="new"
  return <FamiliarForm />;
}
// Note: useLocalSearchParams in [id].tsx returns id as undefined here; we treat any non-edit value as create.
