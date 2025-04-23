import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
  code: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  code,
}) => (
  <div>
    <h1>Dobrodošli, {firstName}!</h1>
    <p>Vaš verifikacioni kod je: <strong>{code}</strong></p>
  </div>
);