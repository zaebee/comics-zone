
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {useCallback, useState, useEffect} from 'react';

export const useApiKey = () => {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowApiKeyDialog(true);
    }
  }, []);

  const validateApiKey = useCallback(async (): Promise<boolean> => {
    if (!apiKey) {
      setShowApiKeyDialog(true);
      return false;
    }
    return true;
  }, [apiKey]);

  const handleApiKeyDialogContinue = useCallback((inputKey: string) => {
    if (!inputKey.trim()) return;
    const cleanKey = inputKey.trim();
    setApiKey(cleanKey);
    localStorage.setItem('gemini_api_key', cleanKey);
    setShowApiKeyDialog(false);
  }, []);

  return {
    apiKey,
    showApiKeyDialog,
    setShowApiKeyDialog,
    validateApiKey,
    handleApiKeyDialogContinue,
  };
};
