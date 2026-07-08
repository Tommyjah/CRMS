-- migration: 0012_rls_storage_attachments.sql

-- Allow public read access to the request-attachments bucket
CREATE POLICY "public_can_view_request_attachments"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'request-attachments');

-- Allow authenticated users to upload into the request-attachments bucket
CREATE POLICY "authenticated_can_upload_request_attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'request-attachments');

-- Allow authenticated users to update (replace) files in the request-attachments bucket
CREATE POLICY "authenticated_can_update_request_attachments"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'request-attachments');

-- Allow authenticated users to delete files in the request-attachments bucket
CREATE POLICY "authenticated_can_delete_request_attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'request-attachments');
