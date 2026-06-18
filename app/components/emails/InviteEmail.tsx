import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface InviteEmailProps {
  inviterEmail: string;
  workspaceName: string;
  role: string;
  inviteLink: string;
}

export const InviteEmail = ({
  inviterEmail = 'admin@example.com',
  workspaceName = 'Workspace',
  role = 'viewer',
  inviteLink = 'https://example.com/invite',
}: InviteEmailProps) => {
  const previewText = `Join ${workspaceName} on AI Form Builder`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded-lg my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                Join <strong>{workspaceName}</strong>
              </Heading>
              <Text className="text-black text-[14px] leading-[24px]">
                Hello,
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                <strong>{inviterEmail}</strong> has invited you to join the <strong>{workspaceName}</strong> workspace as an <strong>{role}</strong>.
              </Text>
              <Section className="text-center mt-[32px] mb-[32px]">
                <Button
                  className="bg-[#4f46e5] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                  href={inviteLink}
                >
                  Accept Invitation
                </Button>
              </Section>
              <Text className="text-black text-[14px] leading-[24px]">
                or copy and paste this URL into your browser:{' '}
                <a href={inviteLink} className="text-[#4f46e5] no-underline">
                  {inviteLink}
                </a>
              </Text>
              <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
              <Text className="text-[#666666] text-[12px] leading-[24px]">
                This invitation was intended for you. This invite was sent from AI Form Builder.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InviteEmail;
