import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { DocumentForm } from '../../src/DocumentForm';

export default function NewDocument() {
  const { familiar_id } = useLocalSearchParams<{ familiar_id?: string }>();
  return <DocumentForm defaultFamiliarId={familiar_id as string | undefined} />;
}
