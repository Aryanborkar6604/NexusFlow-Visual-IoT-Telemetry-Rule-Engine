import React from 'react';
import { FlowCanvas } from '../components/canvas/FlowCanvas.jsx';

export function WorkflowBuilderPage() {
  return (
    <div className="h-[calc(100vh-61px)] overflow-hidden">
      <FlowCanvas initialWorkflowId="wf_turbine_01" />
    </div>
  );
}
