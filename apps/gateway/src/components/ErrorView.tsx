import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ErrorView({
  title,
  message,
  back_to = '/',
}: {
  title: string;
  message: string;
  back_to?: string;
}) {
  return (
    <div className="grid gap-4">
      <Alert variant="destructive">
        <AlertTriangle className="size-4" aria-hidden />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="break-words">{message}</AlertDescription>
      </Alert>
      <Button asChild variant="outline" className="justify-self-start">
        <Link to={back_to}>
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      </Button>
    </div>
  );
}
