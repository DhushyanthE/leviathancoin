import React from 'react'

interface Web3StorageUploadProps {
  closeModal: () => void
}

const Web3StorageUpload: React.FC<Web3StorageUploadProps> = ({ closeModal }) => {
  return (
    <div>
      <h2 className="text-lg font-bold">Web3.Storage Upload</h2>
      <p className="py-2 text-sm text-slate-600">This demo component is a placeholder for Web3.Storage integration.</p>
      <button className="btn btn-primary mt-4" onClick={closeModal}>
        Close
      </button>
    </div>
  )
}

export default Web3StorageUpload
