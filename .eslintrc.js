module.exports = {
    extends: 'next/core-web-vitals',
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn', // Cambia de 'error' a 'warn'
      '@typescript-eslint/no-explicit-any': 'warn', // Cambia de 'error' a 'warn'
      'react-hooks/exhaustive-deps': 'warn', // Cambia de 'error' a 'warn'
      '@next/next/no-img-element': 'warn', // Cambia de 'error' a 'warn'
    },
  };