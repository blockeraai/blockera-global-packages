/**
 * External dependencies
 */
import type { ReactNode } from 'react';

interface CodeEditorSidebarNoticeProps {
	dataTest: string;
	children: ReactNode;
}

/**
 * Empty-state copy shown in the secondary sidebar while the code editor is open.
 */
export default function CodeEditorSidebarNotice({
	dataTest,
	children,
}: CodeEditorSidebarNoticeProps) {
	return (
		<div
			className="blockera-code-editor-sidebar-notice"
			data-test={dataTest}
		>
			<p>{children}</p>
		</div>
	);
}
