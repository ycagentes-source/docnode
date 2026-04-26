import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { DocumentForm } from '../../../src/DocumentForm';

export default function EditDocument() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DocumentForm documentoId={id as string} />;
}
