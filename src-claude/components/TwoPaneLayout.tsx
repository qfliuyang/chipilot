import React, { useState, useCallback, type ReactNode } from 'react';
import { Box, useInput } from '../ink.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { FullscreenLayout, type Props as FullscreenLayoutProps } from './FullscreenLayout.js';
import { TerminalSession } from './Terminal/TerminalSession.js';
import { TerminalPane } from './Terminal/index.js';

type FocusPane = 'chat' | 'terminal';

type TwoPaneLayoutProps = FullscreenLayoutProps & {
  terminalSession: TerminalSession;
  terminalEnabled: boolean;
  chatWidthPercent?: number;
};

export function TwoPaneLayout({
  terminalSession,
  terminalEnabled,
  chatWidthPercent = 60,
  scrollable,
  bottom,
  overlay,
  bottomFloat,
  modal,
  modalScrollRef,
  scrollRef,
  dividerYRef,
  hidePill,
  hideSticky,
  newMessageCount,
  onPillClick,
}: TwoPaneLayoutProps): React.ReactElement {
  const { width: terminalWidth, height: terminalHeight } = useTerminalSize();
  const [focusedPane, setFocusedPane] = useState<FocusPane>('chat');

  // Calculate widths
  const chatWidth = Math.floor((terminalWidth * chatWidthPercent) / 100);
  const termWidth = terminalWidth - chatWidth;

  // Handle tab key to switch focus
  useInput(
    useCallback(
      (_input, key) => {
        if (key.tab) {
          setFocusedPane(prev => (prev === 'chat' ? 'terminal' : 'chat'));
        }
      },
      []
    )
  );

  // If terminal is disabled, fall back to FullscreenLayout
  if (!terminalEnabled) {
    return (
      <FullscreenLayout
        scrollable={scrollable}
        bottom={bottom}
        overlay={overlay}
        bottomFloat={bottomFloat}
        modal={modal}
        modalScrollRef={modalScrollRef}
        scrollRef={scrollRef}
        dividerYRef={dividerYRef}
        hidePill={hidePill}
        hideSticky={hideSticky}
        newMessageCount={newMessageCount}
        onPillClick={onPillClick}
      />
    );
  }

  // Two-pane layout
  return (
    <Box flexDirection="row" width={terminalWidth}>
      {/* Chat Pane */}
      <Box width={chatWidth}>
        <FullscreenLayout
          scrollable={scrollable}
          bottom={bottom}
          overlay={overlay}
          bottomFloat={bottomFloat}
          modal={modal}
          modalScrollRef={modalScrollRef}
          scrollRef={scrollRef}
          dividerYRef={dividerYRef}
          hidePill={hidePill}
          hideSticky={hideSticky}
          newMessageCount={newMessageCount}
          onPillClick={onPillClick}
        />
      </Box>

      {/* Terminal Pane */}
      <Box width={termWidth}>
        <TerminalPane
          session={terminalSession}
          width={termWidth}
          height={terminalHeight}
          focused={focusedPane === 'terminal'}
        />
      </Box>
    </Box>
  );
}
