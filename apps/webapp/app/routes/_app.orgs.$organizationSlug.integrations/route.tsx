import { ChevronRightIcon } from "@heroicons/react/24/solid";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { useState } from "react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { IntegrationIcon } from "~/assets/icons/IntegrationIcon";
import { Feedback } from "~/components/Feedback";
import { HowToConnectAnIntegration } from "~/components/helpContent/HelpContentText";
import { ConnectToIntegrationSheet } from "~/components/integrations/ConnectToIntegrationSheet";
import { IntegrationWithMissingFieldSheet } from "~/components/integrations/IntegrationWithMissingFieldSheet";
import { NoIntegrationSheet } from "~/components/integrations/NoIntegrationSheet";
import { PageBody, PageContainer } from "~/components/layout/AppLayout";
import { BreadcrumbLink } from "~/components/navigation/Breadcrumb";
import { LinkButton } from "~/components/primitives/Buttons";
import { Callout } from "~/components/primitives/Callout";
import { DateTime } from "~/components/primitives/DateTime";
import { DetailCell } from "~/components/primitives/DetailCell";
import { Header2 } from "~/components/primitives/Headers";
import { Help, HelpContent, HelpTrigger } from "~/components/primitives/Help";
import { Input } from "~/components/primitives/Input";
import { NamedIcon } from "~/components/primitives/NamedIcon";
import {
  PageButtons,
  PageDescription,
  PageHeader,
  PageTitle,
  PageTitleRow,
} from "~/components/primitives/PageHeader";
import { Switch } from "~/components/primitives/Switch";
import {
  Table,
  TableBlankRow,
  TableBody,
  TableCell,
  TableCellChevron,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "~/components/primitives/Table";
import { SimpleTooltip } from "~/components/primitives/Tooltip";
import { MatchedOrganization, useOrganization } from "~/hooks/useOrganizations";
import { useProject } from "~/hooks/useProject";
import { useTextFilter } from "~/hooks/useTextFilter";
import { Project } from "~/models/project.server";
import {
  Client,
  IntegrationOrApi,
  IntegrationsPresenter,
} from "~/presenters/IntegrationsPresenter.server";
import { requireUser } from "~/services/session.server";
import { Handle } from "~/utils/handle";
import {
  OrganizationParamsSchema,
  ProjectParamSchema,
  docsCreateIntegration,
  docsPath,
  integrationClientPath,
} from "~/utils/pathBuilder";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const { organizationSlug } = OrganizationParamsSchema.parse(params);

  const presenter = new IntegrationsPresenter();
  const data = await presenter.call({
    userId: user.id,
    organizationSlug,
  });

  return typedjson(data);
};

export const handle: Handle = {
  breadcrumb: (match) => <BreadcrumbLink to={match.pathname} title="Integrations" />,
};

export default function Integrations() {
  const { clients, clientMissingFields, options, callbackUrl } =
    useTypedLoaderData<typeof loader>();
  const organization = useOrganization();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitleRow>
          <PageTitle title="Integrations" />
          <PageButtons>
            <LinkButton
              to={docsPath("/integrations/introduction")}
              variant="secondary/small"
              LeadingIcon="docs"
            >
              Integrations documentation
            </LinkButton>
          </PageButtons>
        </PageTitleRow>
        <PageDescription>
          Easily use an Integration, an existing Node.js SDK or make HTTP calls from a Job.
        </PageDescription>
      </PageHeader>

      <PageBody scrollable={false}>
        <div className="grid h-full max-w-full grid-cols-[2fr_3fr] gap-4 divide-x divide-slate-900 overflow-hidden">
          <PossibleIntegrationsList
            options={options}
            organizationId={organization.id}
            callbackUrl={callbackUrl}
          />
          <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
            {clientMissingFields.length > 0 && (
              <IntegrationsWithMissingFields
                clients={clientMissingFields}
                organizationId={organization.id}
                callbackUrl={callbackUrl}
                options={options}
              />
            )}
            <ConnectedIntegrationsList clients={clients} organization={organization} />
          </div>
        </div>
      </PageBody>
    </PageContainer>
  );
}

function PossibleIntegrationsList({
  options,
  organizationId,
  callbackUrl,
}: {
  options: IntegrationOrApi[];
  organizationId: string;
  callbackUrl: string;
}) {
  const [onlyShowIntegrations, setOnlyShowIntegrations] = useState(false);
  const optionsToShow = onlyShowIntegrations
    ? options.filter((o) => o.type === "integration")
    : options;
  const { filterText, setFilterText, filteredItems } = useTextFilter<IntegrationOrApi>({
    items: optionsToShow,
    filter: (integration, text) => integration.name.toLowerCase().includes(text.toLowerCase()),
  });

  return (
    <div className="overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
      <div className="py-4 pl-4">
        <div className="flex items-center justify-between">
          <Header2 className="mb-2">Connect an API</Header2>
          <Switch
            checked={onlyShowIntegrations}
            onCheckedChange={setOnlyShowIntegrations}
            variant="small"
            label={
              <span className="mt-0.5 inline-flex items-center gap-1">
                <IntegrationIcon /> Trigger.dev Integrations
              </span>
            }
          />
        </div>
        <Input
          placeholder="Search APIs"
          className="mb-2"
          variant="medium"
          icon="search"
          fullWidth={true}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <div className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[repeat(auto-fill,_minmax(14rem,_auto))]">
          {filteredItems.map((option) => {
            switch (option.type) {
              case "integration":
                return (
                  <ConnectToIntegrationSheet
                    key={option.identifier}
                    integration={option}
                    organizationId={organizationId}
                    callbackUrl={callbackUrl}
                    icon={option.icon}
                    button={
                      <AddIntegrationConnection
                        identifier={option.identifier}
                        name={option.name}
                        icon={option.icon}
                        isIntegration
                      />
                    }
                  />
                );
              case "api":
                return (
                  <NoIntegrationSheet
                    key={option.identifier}
                    api={option}
                    requested={option.voted}
                    button={
                      <AddIntegrationConnection
                        identifier={option.identifier}
                        name={option.name}
                        isIntegration={false}
                      />
                    }
                  />
                );
            }
          })}
        </div>
        <Header2 className="mb-2 mt-6">Missing an API?</Header2>
        <Feedback
          button={
            <button className="w-full">
              <DetailCell
                leadingIcon="plus"
                leadingIconClassName="text-dimmed"
                label="Request an API and we'll add it to the list as an Integration"
                trailingIcon="chevron-right"
                trailingIconClassName="text-slate-700 group-hover:text-bright"
              />
            </button>
          }
          defaultValue="integration"
        />

        <Header2 className="mb-2 mt-6">Create an Integration</Header2>
        <a href="https://docs.trigger.dev/integrations/create" target="_blank">
          <DetailCell
            leadingIcon="integration"
            leadingIconClassName="text-dimmed"
            label="Learn how to create your own API Integrations"
            trailingIcon="external-link"
            trailingIconClassName="text-slate-700 group-hover:text-bright"
          />
        </a>
      </div>
    </div>
  );
}

function ConnectedIntegrationsList({
  clients,
  organization,
}: {
  clients: Client[];
  organization: MatchedOrganization;
}) {
  const { filterText, setFilterText, filteredItems } = useTextFilter<Client>({
    items: clients,
    filter: (client, text) => {
      if (client.title.toLowerCase().includes(text.toLowerCase())) {
        return true;
      }

      if (
        client.customClientId &&
        client.customClientId.toLowerCase().includes(text.toLowerCase())
      ) {
        return true;
      }

      if (client.integration.name.toLowerCase().includes(text.toLowerCase())) {
        return true;
      }

      if (client.authMethod.name.toLowerCase().includes(text.toLowerCase())) {
        return true;
      }

      return false;
    },
  });

  return (
    <Help>
      <HelpContent title="How to connect an Integration">
        <HowToConnectAnIntegration />
      </HelpContent>
      <div className="mb-2 flex items-center justify-between">
        <Header2 className="m-0">Your connected Integrations</Header2>
      </div>
      {clients.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Input
              placeholder="Search connected Integrations"
              variant="tertiary"
              icon="search"
              fullWidth={true}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <HelpTrigger title="How do I connect an Integration?" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>API</TableHeaderCell>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Jobs</TableHeaderCell>
                <TableHeaderCell>Scopes</TableHeaderCell>
                <TableHeaderCell>Client id</TableHeaderCell>
                <TableHeaderCell>Connections</TableHeaderCell>
                <TableHeaderCell>Added</TableHeaderCell>
                <TableHeaderCell hiddenLabel>Go to page</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableBlankRow colSpan={8}>
                  <div className="flex items-center justify-center">
                    <Callout variant="info" className="w-auto">
                      No connected Integrations match your filters.
                    </Callout>
                  </div>
                </TableBlankRow>
              ) : (
                <>
                  {filteredItems.map((client) => {
                    const path = integrationClientPath(organization, client);
                    return (
                      <TableRow key={client.id}>
                        <TableCell to={path}>{client.title}</TableCell>
                        <TableCell to={path}>
                          <span className="flex items-center gap-1">
                            <NamedIcon name={client.icon} className="h-5 w-5" />
                            {client.integration.name}
                          </span>
                        </TableCell>
                        <TableCell to={path}>{client.slug}</TableCell>
                        <TableCell to={path}>{client.authMethod.name}</TableCell>
                        <TableCell to={path}>{client.jobCount}</TableCell>
                        <TableCell to={path}>
                          {client.authSource === "LOCAL" ? "–" : client.scopesCount}
                        </TableCell>
                        <TableCell to={path}>
                          {client.authSource === "LOCAL" ? (
                            "–"
                          ) : (
                            <SimpleTooltip
                              button={
                                client.customClientId ? (
                                  `${client.customClientId.substring(0, 8)}…`
                                ) : (
                                  <span className="text-slate-600">Auto</span>
                                )
                              }
                              content={
                                client.customClientId
                                  ? client.customClientId
                                  : "This uses the Trigger.dev OAuth client"
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell to={path}>
                          {client.authSource === "LOCAL" ? "–" : client.connectionsCount}
                        </TableCell>
                        <TableCell to={path}>
                          <DateTime date={client.createdAt} includeSeconds={false} />
                        </TableCell>
                        <TableCellChevron to={path} isSticky />
                      </TableRow>
                    );
                  })}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Help>
  );
}

function IntegrationsWithMissingFields({
  clients,
  organizationId,
  callbackUrl,
  options,
}: {
  clients: Client[];
  organizationId: string;
  callbackUrl: string;
  options: IntegrationOrApi[];
}) {
  const integrationsList = options.flatMap((o) => (o.type === "integration" ? [o] : []));

  return (
    <div className="mb-6">
      <Header2 className="mb-2 flex items-center gap-1">
        <NamedIcon name="error" className="h-5 w-5" />
        Integrations requiring configuration
      </Header2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>API</TableHeaderCell>
            <TableHeaderCell>Added</TableHeaderCell>
            <TableHeaderCell hiddenLabel>Go to page</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const integration = integrationsList.find(
              (i) => i.identifier === client.integrationIdentifier
            );

            if (!integration) {
              return <div key={client.id}>Can't find matching integration</div>;
            }

            return (
              <TableRow key={client.id}>
                <TableCell>
                  <IntegrationWithMissingFieldSheet
                    integration={integration}
                    organizationId={organizationId}
                    button={
                      <span className="inline-flex items-center gap-1">
                        <NamedIcon name="error" className="h-5 w-5" /> {client.title}
                      </span>
                    }
                    callbackUrl={callbackUrl}
                    existingIntegration={client}
                    className="flex w-full cursor-pointer justify-start"
                  />
                </TableCell>
                <TableCell>
                  <IntegrationWithMissingFieldSheet
                    integration={integration}
                    organizationId={organizationId}
                    button={
                      <span className="flex items-center gap-1">
                        <NamedIcon name={client.integrationIdentifier} className="h-5 w-5" />
                        {client.integration.name}
                      </span>
                    }
                    callbackUrl={callbackUrl}
                    existingIntegration={client}
                    className="flex w-full cursor-pointer justify-start"
                  />
                </TableCell>
                <TableCell>
                  <IntegrationWithMissingFieldSheet
                    integration={integration}
                    organizationId={organizationId}
                    button={<DateTime date={client.createdAt} />}
                    callbackUrl={callbackUrl}
                    existingIntegration={client}
                    className="flex w-full cursor-pointer justify-start"
                  />
                </TableCell>
                <TableCell alignment="right">
                  <IntegrationWithMissingFieldSheet
                    integration={integration}
                    organizationId={organizationId}
                    button={
                      <ChevronRightIcon className="h-4 w-4 text-dimmed transition group-hover:text-bright" />
                    }
                    callbackUrl={callbackUrl}
                    existingIntegration={client}
                    className="flex w-full cursor-pointer justify-end"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function AddIntegrationConnection({
  identifier,
  name,
  isIntegration,
  icon,
}: {
  identifier: string;
  name: string;
  isIntegration: boolean;
  icon?: string;
}) {
  return (
    <DetailCell
      className="w-full"
      leadingIcon={icon ?? identifier}
      label={name}
      trailingIcon="plus"
      trailingIconClassName="text-slate-700 group-hover:text-bright"
    />
  );
}
