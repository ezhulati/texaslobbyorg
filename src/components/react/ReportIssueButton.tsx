import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ReportIssueButtonProps {
  lobbyistId: string;
  lobbyistName: string;
}

export default function ReportIssueButton({ lobbyistId, lobbyistName }: ReportIssueButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const issueTypes = [
    { value: 'incorrect_info', label: 'Incorrect Information' },
    { value: 'outdated_clients', label: 'Outdated Client List' },
    { value: 'fraudulent_claims', label: 'Fraudulent Claims' },
    { value: 'duplicate_profile', label: 'Duplicate Profile' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'other', label: 'Other Issue' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyistId,
          lobbyistName,
          issueType,
          description,
          reporterEmail,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          setIsOpen(false);
          setIssueType('');
          setDescription('');
          setReporterEmail('');
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Report Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        title="Report inaccurate or fraudulent information"
      >
        <AlertCircle className="h-4 w-4" />
        <span>Report Issue</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-semibold">Report Issue</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Help us maintain accurate information
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Reporting on: <span className="font-medium text-foreground">{lobbyistName}</span>
                  </p>
                </div>

                {/* Issue Type */}
                <div>
                  <label htmlFor="issue-type" className="block text-sm font-medium mb-2">
                    What's the issue? <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="issue-type"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-texas-blue-500"
                  >
                    <option value="">Select an issue type...</option>
                    {issueTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    placeholder="Please describe the issue in detail. For TEC-sourced data, we'll verify against official records. For user-submitted content, we'll review and take appropriate action."
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-texas-blue-500 resize-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Your Email <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-texas-blue-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional. We may contact you for clarification.
                  </p>
                </div>

                {/* Submit Status */}
                {submitStatus === 'success' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      ✓ Thank you! We'll review your report and take appropriate action.
                    </p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      Failed to submit report. Please try again.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !issueType || !description}
                    className="flex-1 px-4 py-2 bg-texas-blue-600 text-white rounded-md hover:bg-texas-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
