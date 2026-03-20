-- Add RLS policies for payment_proofs storage bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload own payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment_proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view own proofs
CREATE POLICY "Users can view own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment_proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can view all payment proofs
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment_proofs' AND public.has_role(auth.uid(), 'admin'));
